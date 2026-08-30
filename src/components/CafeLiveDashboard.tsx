import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Monitor, Gamepad2, Laptop, User, Clock, CheckCircle2 } from 'lucide-react';
import { CafeLiveStatus } from '../types';

export const CafeLiveDashboard: React.FC = () => {
  const [liveData, setLiveData] = useState<CafeLiveStatus[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getCafeDetails = (cafe: CafeLiveStatus) => cafe.cafe_details || {};

  const getGalleryImages = (details: Record<string, any>) => {
    const gallery = details.gallery || details.galleryImages || details.images || [];
    return Array.isArray(gallery) ? gallery.filter((image) => typeof image === 'string' && image.trim()) : [];
  };

  const getAmenities = (details: Record<string, any>) => {
    const amenities = details.amenities || details.facilities || [];
    return Array.isArray(amenities) ? amenities : [];
  };

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
        <div className="grid grid-cols-1 gap-6">
          {liveData.map((cafe) => (
            <div key={cafe.cafe_id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-5 border-b border-neutral-800 bg-black/40 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    {cafe.cafe_name}
                    {cafe.status === 'active' ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title="Suspended"></span>
                    )}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mt-1">Cafe ID: #{cafe.cafe_id}</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Last POS sync: {formatSyncedTime((cafe as CafeLiveStatus & { last_heartbeat?: string }).last_heartbeat)}</p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-6">
                {(() => {
                  const details = getCafeDetails(cafe);
                  const gallery = getGalleryImages(details);
                  const amenities = getAmenities(details);
                  return (details.description || details.address || details.city || details.hours || amenities.length > 0 || gallery.length > 0) ? (
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
      )}
    </section>
  );
};
