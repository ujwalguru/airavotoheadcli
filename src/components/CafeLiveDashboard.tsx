import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Monitor, Gamepad2, Laptop, User, Clock, CheckCircle2, Search, X, ChevronRight, WifiOff } from 'lucide-react';
import { CafeLiveStatus } from '../types';

export const CafeLiveDashboard: React.FC = () => {
  const [liveData, setLiveData] = useState<CafeLiveStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCafe, setSelectedCafe] = useState<CafeLiveStatus | null>(null);

  const fetchLiveData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/admin/live-status', { headers });
      const data = await res.json();
      if (data.success) {
        setLiveData(data.liveStatus || []);
      }
    } catch (error) {
      console.error('Failed to fetch live status', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();

    // Keep the monitor aligned with the POS heartbeat cadence.
    const interval = setInterval(fetchLiveData, 60000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  const getDeviceIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PC':
        return <Monitor className="w-4 h-4 text-purple-500" />;
      case 'PS5':
        return <Gamepad2 className="w-4 h-4 text-purple-500" />;
      default:
        return <Laptop className="w-4 h-4 text-purple-500" />;
    }
  };

  const formatSyncedTime = (value?: string) => {
    if (!value) return 'Not synced yet';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Invalid timestamp' : date.toLocaleString();
  };

  const formatSeatTime = (value: any) => {
    if (!value) return '—';
    const text = String(value);
    if (/^\\d{1,2}:\\d{2}/.test(text)) return text.slice(0, 5);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? text : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCafeDetails = (cafe: CafeLiveStatus) => cafe.cafe_details || {};

  const isCafeOnline = (cafe: CafeLiveStatus) => cafe.status === 'active' && cafe.is_online === true;
  const getCafeStatusLabel = (cafe: CafeLiveStatus) => {
    if (isCafeOnline(cafe)) return 'Online';
    return cafe.status === 'suspended' ? 'Suspended' : 'Offline';
  };

  const normalizeSeatKey = (value: any) => {
    const text = String(value ?? '').trim().toLowerCase();
    const number = text.match(/(?:pc|ps5|seat|console)?\\s*[-_# ]*0*(\\d+)$/i)?.[1];
    return number ? `seat-${number}` : text.replace(/[^a-z0-9]/g, '');
  };

  const getGalleryImages = (details: Record<string, any>) => {
    const gallery = details.gallery || details.galleryImages || details.images || [];
    if (!Array.isArray(gallery)) return [];
    return gallery.map((image) => typeof image === 'string' ? image : image?.imageUrl || image?.image_url || image?.url || '').filter((image) => typeof image === 'string' && image.trim());
  };

  const getAmenities = (details: Record<string, any>) => {
    const amenities = details.amenities || details.facilities || [];
    return Array.isArray(amenities) ? amenities : [];
  };

  const getCatalog = (details: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      if (Array.isArray(details[key])) return details[key];
    }
    return [];
  };

  const getGamePlatform = (game: any) => {
    const explicit = game?.platform || game?.platformName || game?.deviceType || game?.device || game?.system;
    if (explicit) return String(explicit);
    const category = String(game?.category || '').toLowerCase();
    if (category.includes('console') || category.includes('ps5') || category.includes('playstation')) return 'PS5';
    if (category.includes('pc')) return 'PC';
    return game?.category || 'Platform not specified';
  };

  const filteredCafes = liveData.filter((cafe) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const details = getCafeDetails(cafe);
    return [cafe.cafe_name, cafe.cafe_id, details.city, details.address, ...(details.categories || [])].some((value) => String(value ?? '').toLowerCase().includes(query));
  });

  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <section className="p-8 flex-1 overflow-auto flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Live Cafe Monitor</h2>
          <p className="text-sm text-neutral-400 mt-1">Real-time device availability and current customer entries.</p>
        </div>
        <button
          onClick={fetchLiveData}
          disabled={loading}
          className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-md border border-neutral-800 transition flex items-center gap-2 text-xs font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="mb-6 relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search cafes by name, city, address, or ID..." className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-purple-500" />
      </div>

      {loading && liveData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading live data...
        </div>
      ) : liveData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
          No cafes are currently registered. Waiting for POS connections.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {filteredCafes.map((cafe) => {
              const total = cafe.devices.reduce((sum, device) => sum + Number(device.total || 0), 0);
              const inUse = cafe.devices.reduce((sum, device) => sum + Number(device.inUse || 0), 0);
              const details = getCafeDetails(cafe);
              const online = isCafeOnline(cafe);
              return <button key={cafe.cafe_id} onClick={() => setSelectedCafe(cafe)} className={`text-left bg-neutral-900 border rounded-xl p-4 transition group ${online ? 'border-neutral-800 hover:border-purple-500' : 'border-rose-500/30 hover:border-rose-500/60'}`}>
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{cafe.cafe_name}</h3><p className="text-[11px] text-neutral-500 mt-1">Cafe ID: #{cafe.cafe_id}</p></div><ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-purple-400" /></div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs"><span className="text-neutral-400">Seats <strong className="block text-white text-base">{total}</strong></span><span className="text-neutral-400">In use <strong className="block text-rose-400 text-base">{inUse}</strong></span><span className="text-neutral-400">Status <strong className={`block text-base ${online ? 'text-emerald-400' : 'text-rose-400'}`}><span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} aria-hidden="true" />{getCafeStatusLabel(cafe)}</strong></span></div>
                {(details.city || details.address) && <p className="text-[11px] text-neutral-500 mt-3 truncate">{[details.city, details.address].filter(Boolean).join(' · ')}</p>}
              </button>;
            })}
          </div>
          {filteredCafes.length === 0 && <div className="bg-neutral-900/50 border border-neutral-800 border-dashed rounded-xl p-8 text-center text-sm text-neutral-500">No cafes match “{searchQuery}”.</div>}
          {selectedCafe ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 md:p-8 overflow-y-auto" onClick={() => setSelectedCafe(null)}>
          <div className="max-w-6xl mx-auto bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-end p-3"><button onClick={() => setSelectedCafe(null)} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800" aria-label="Close cafe details"><X className="w-5 h-5" /></button></div>
            <div className="px-4 pb-6 md:px-8">
          {[selectedCafe].map((cafe) => (
            <div key={cafe.cafe_id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-5 border-b border-neutral-800 bg-black/40 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    {cafe.cafe_name}
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isCafeOnline(cafe) ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${isCafeOnline(cafe) ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} title={getCafeStatusLabel(cafe)} />
                      {getCafeStatusLabel(cafe)}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mt-1">Cafe ID: #{cafe.cafe_id}</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Last POS sync: {formatSyncedTime((cafe as CafeLiveStatus & { last_heartbeat?: string }).last_heartbeat)}</p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-6">
                {!isCafeOnline(cafe) && (
                  <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
                    <WifiOff className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                    <div>
                      <p className="text-sm font-semibold">{getCafeStatusLabel(cafe)} — POS app is not connected</p>
                      <p className="text-xs text-rose-200/70 mt-1">Live device availability is hidden until this café sends a fresh POS heartbeat.</p>
                    </div>
                  </div>
                )}
                {(() => {
                  const details = getCafeDetails(cafe);
                  const gallery = getGalleryImages(details);
                  const amenities = getAmenities(details);
                  const games = getCatalog(details, ['games', 'gameCatalog', 'game_catalog']);
                  const foodItems = getCatalog(details, ['foodItems', 'food_items', 'menu']);
                  return (details.description || details.address || details.city || details.hours || amenities.length > 0 || gallery.length > 0 || games.length > 0 || foodItems.length > 0) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                      <div className="space-y-3">
                        {(details.description || details.address || details.city || details.hours) && (
                          <div className="bg-black border border-neutral-800 rounded-lg p-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Cafe Details</h4>
                            {details.description && <p className="text-sm text-neutral-300 mb-2">{details.description}</p>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-400">
                              {details.address && <span>Address: {details.address}</span>}
                              {(details.city || details.state) && <span>Location: {[details.city, details.state].filter(Boolean).join(', ')}</span>}
                              {details.hours && <span>Hours: {details.hours}</span>}
                            </div>
                          </div>
                        )}
                        {amenities.length > 0 && (
                          <div className="bg-black border border-neutral-800 rounded-lg p-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Amenities</h4>
                            <div className="flex flex-wrap gap-2">{amenities.map((amenity, index) => <span key={index} className="px-2 py-1 rounded bg-neutral-900 text-xs text-neutral-300">{typeof amenity === 'string' ? amenity : amenity.name || amenity.label || JSON.stringify(amenity)}</span>)}</div>
                          </div>
                        )}
                      </div>
                      {gallery.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Gallery</h4>
                          <div className="grid grid-cols-2 gap-2">{gallery.map((image, index) => <img key={index} src={image} alt={`${cafe.cafe_name} gallery ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-neutral-800" loading="lazy" />)}</div>
                        </div>
                      )}
                      {(games.length > 0 || foodItems.length > 0) && (
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                          {games.length > 0 && <div className="bg-black border border-neutral-800 rounded-lg p-4"><h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Games by platform</h4><div className="space-y-2">{games.map((game: any, index: number) => { const name = typeof game === 'string' ? game : game.name || game.title || game.gameName || JSON.stringify(game); const platform = typeof game === 'string' ? 'Platform not specified' : getGamePlatform(game); return <div key={index} className="flex items-center justify-between gap-3 text-sm"><span className="text-neutral-300">{name}</span><span className="shrink-0 rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-300">{platform}</span></div>; })}</div></div>}
                          {foodItems.length > 0 && <div className="bg-black border border-neutral-800 rounded-lg p-4"><h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Food Items</h4><div className="space-y-2">{foodItems.map((item: any, index: number) => <div key={index} className="flex justify-between gap-3 text-sm text-neutral-300"><span>{typeof item === 'string' ? item : item.name || item.title || item.itemName || JSON.stringify(item)}</span>{typeof item !== 'string' && item.price != null && <span className="text-purple-400">₹{item.price}</span>}</div>)}</div></div>}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
                {/* Device Availability */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Device Availability</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {cafe.devices.map((device, idx) => {
                      const percent = device.total > 0 ? (device.inUse / device.total) * 100 : 0;
                      return (
                        <div key={idx} className="bg-black border border-neutral-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            {getDeviceIcon(device.type)}
                            <span className="text-sm font-medium text-neutral-200">{device.type}</span>
                          </div>
                          <div className="flex items-end justify-between mb-2">
                            <span className="text-2xl font-bold text-white leading-none">{device.total - device.inUse}</span>
                            <span className="text-xs text-neutral-500 font-medium">/ {device.total} free</span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${percent >= 90 ? 'bg-rose-500' : percent >= 75 ? 'bg-yellow-500' : 'bg-purple-500'}`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          {(device.startTime || device.endTime || device.start_time || device.end_time) && (
                            <p className="text-[10px] text-neutral-500 mt-2">Schedule: {device.startTime || device.start_time || '--'}–{device.endTime || device.end_time || '--'}</p>
                          )}
                          {Array.isArray(device.seats) && device.seats.length > 0 && (
                            <div className="mt-2 space-y-1">{device.seats.map((seat: any, seatIndex: number) => <p key={seatIndex} className="text-[10px] text-neutral-500">{seat.name || seat.seatName || seat.id || `Seat ${seatIndex + 1}`}: {seat.status || (seat.available ? 'available' : 'in use')}</p>)}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const mergedSeats = new Map<string, any>();
                    cafe.devices.forEach((device: any) => {
                      (Array.isArray(device.seats) ? device.seats : []).forEach((seat: any, seatIndex: number) => {
                        const displayName = seat.name || seat.seatName || seat.seat_number || seat.id || `Seat ${seatIndex + 1}`;
                        const key = `${String(device.type || 'device').toLowerCase()}-${normalizeSeatKey(displayName)}`;
                        const previous = mergedSeats.get(key);
                        const merged = previous ? {
                          ...previous,
                          ...seat,
                          name: previous.name || displayName,
                          status: seat.status && seat.status !== 'available' ? seat.status : previous.status || seat.status,
                          available: seat.available === false ? false : previous.available,
                          startTime: seat.startTime || seat.start_time || previous.startTime || previous.start_time,
                          endTime: seat.endTime || seat.end_time || previous.endTime || previous.end_time,
                          category: device.type,
                          key,
                        } : { ...seat, name: displayName, category: device.type, key };
                        mergedSeats.set(key, merged);
                      });
                    });
                    const seatRows = Array.from(mergedSeats.values());
                    return seatRows.length > 0 ? (
                      <div className="mt-4 overflow-x-auto bg-black border border-neutral-800 rounded-lg">
                        <table className="w-full text-left border-collapse min-w-[620px]">
                          <thead className="bg-neutral-900 border-b border-neutral-800 text-[10px] uppercase text-neutral-500 font-semibold tracking-wider">
                            <tr><th className="px-4 py-2.5">Device</th><th className="px-4 py-2.5">Seat</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Start time</th><th className="px-4 py-2.5">End time</th></tr>
                          </thead>
                          <tbody className="text-xs divide-y divide-neutral-800">
                            {seatRows.map((seat: any) => {
                              const status = String(seat.status || (seat.available === false ? 'in_use' : 'available')).toLowerCase();
                              const isAvailable = status === 'available' || status === 'free';
                              return <tr key={seat.key}>
                                <td className="px-4 py-3 text-neutral-400 font-mono">{seat.category}</td>
                                <td className="px-4 py-3 font-medium text-white">{seat.name || seat.seatName || seat.seat_number || seat.id || 'Unnamed seat'}</td>
                                <td className={`px-4 py-3 font-semibold ${isAvailable ? 'text-emerald-400' : status === 'scheduled' ? 'text-amber-400' : 'text-rose-400'}`}>{isAvailable ? 'Available' : status === 'scheduled' ? 'Scheduled' : 'In use'}</td>
                                <td className="px-4 py-3 text-neutral-300 font-mono">{formatSeatTime(seat.startTime || seat.start_time)}</td>
                                <td className="px-4 py-3 text-neutral-300 font-mono">{formatSeatTime(seat.endTime || seat.end_time)}</td>
                              </tr>;
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Today's Entries (Active Sessions) */}
                <div className="flex-1 flex flex-col">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Active Sessions</h4>
                  
                  {cafe.recent_entries.length === 0 ? (
                    <div className="bg-black border border-neutral-800 rounded-lg p-6 text-center flex-1 flex items-center justify-center">
                      <p className="text-sm text-neutral-500">No active sessions at the moment.</p>
                    </div>
                  ) : (
                    <div className="bg-black border border-neutral-800 rounded-lg overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-neutral-900 border-b border-neutral-800 text-[10px] uppercase text-neutral-500 font-semibold tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5">Customer</th>
                            <th className="px-4 py-2.5">Device</th>
                            <th className="px-4 py-2.5">Duration</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-neutral-800">
                          {cafe.recent_entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-neutral-900/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-neutral-200 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center">
                                  <User className="w-3 h-3 text-neutral-400" />
                                </div>
                                {entry.customer}
                              </td>
                              <td className="px-4 py-3 text-neutral-400 font-mono">
                                {entry.device}
                              </td>
                              <td className="px-4 py-3 text-neutral-400 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-purple-500" />
                                {calculateDuration(entry.startTime)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-500">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Active
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Configurations */}
                {cafe.configurations && (
                  <div className="mt-6 flex flex-col gap-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Live Config Dump</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black border border-neutral-800 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-neutral-400 mb-2">Device Configurations</h5>
                        <ul className="text-[10px] text-neutral-500 space-y-1">
                          {cafe.configurations.devices?.map((d: any, i: number) => (
                            <li key={i}>{d.category} - {d.seat_name || d.seatName || d.name || 'Unnamed device'} ({d.status || (d.enabled ? 'enabled' : 'disabled')})</li>
                          ))}
                          {!cafe.configurations.devices?.length && <li>No device configs</li>}
                        </ul>
                      </div>
                      <div className="bg-black border border-neutral-800 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-neutral-400 mb-2">Regular Pricing</h5>
                        <ul className="text-[10px] text-neutral-500 space-y-1">
                          {cafe.configurations.pricing?.map((p: any, i: number) => (
                            <li key={i}>{p.category}: {p.duration}min / {p.person_count ?? p.personCount ?? 0}p = ${p.price}</li>
                          ))}
                          {!cafe.configurations.pricing?.length && <li>No pricing configs</li>}
                        </ul>
                      </div>
                      <div className="bg-black border border-neutral-800 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-neutral-400 mb-2">Happy Hours</h5>
                        <ul className="text-[10px] text-neutral-500 space-y-1">
                          {cafe.configurations.happyHours?.map((h: any, i: number) => (
                            <li key={i}>{h.category}: {h.start_time || h.startTime}–{h.end_time || h.endTime} ({h.enabled ? 'ON' : 'OFF'})</li>
                          ))}
                          {!cafe.configurations.happyHours?.length && <li>No happy hour schedules</li>}
                        </ul>
                      </div>
                      <div className="bg-black border border-neutral-800 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-neutral-400 mb-2">Happy Hour Pricing</h5>
                        <ul className="text-[10px] text-neutral-500 space-y-1">
                          {cafe.configurations.happyHoursPricing?.map((hp: any, i: number) => (
                            <li key={i}>{hp.category}: {hp.duration}min / {hp.person_count ?? hp.personCount ?? 0}p = ${hp.price}</li>
                          ))}
                          {!cafe.configurations.happyHoursPricing?.length && <li>No happy hour pricing</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
            </div>
          </div>
        </div>
          ) : (
            <div className="bg-neutral-900/50 border border-neutral-800 border-dashed rounded-xl p-10 text-center text-sm text-neutral-500">Select a cafe card to open its complete live details.</div>
          )}
        </>
      )}
    </section>
  );
};
