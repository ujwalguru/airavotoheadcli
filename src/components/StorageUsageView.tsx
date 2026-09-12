import React, { useCallback, useEffect, useState } from 'react';
import { Database, HardDrive, Image, RefreshCw, Server } from 'lucide-react';

type StorageUsage = {
  database: { provider: string; name: string | null; bytes: number | null; megabytes: number | null };
  fallbackFile: { path: string; bytes: number; megabytes: number };
  temporaryGallery: { count: number; bytes: number; kilobytes: number; ttlMinutes: number };
  checkedAt: string;
};

function formatBytes(bytes: number | null) {
  if (bytes === null) return 'Unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const StorageUsageView: React.FC = () => {
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStorage = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/storage', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Unable to load storage usage.');
      setStorage(data.storage);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Unable to load storage usage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStorage(); }, [fetchStorage]);

  return (
    <section className="p-8 flex-1 overflow-auto animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-purple-400 mb-2">Infrastructure</p>
          <h2 className="text-2xl font-bold text-white">Render Storage Usage</h2>
          <p className="text-sm text-neutral-500 mt-2">Monitor database storage and temporary POS gallery images.</p>
        </div>
        <button onClick={fetchStorage} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      {error && <div className="mb-5 rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
      {storage && <>
        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={<Database className="h-5 w-5" />} label="PostgreSQL database" value={formatBytes(storage.database.bytes)} detail={storage.database.name || storage.database.provider} />
          <Metric icon={<Image className="h-5 w-5" />} label="Temporary gallery images" value={formatBytes(storage.temporaryGallery.bytes)} detail={`${storage.temporaryGallery.count} image(s), expires after ${storage.temporaryGallery.ttlMinutes} minutes`} />
          <Metric icon={<HardDrive className="h-5 w-5" />} label="Fallback file storage" value={formatBytes(storage.fallbackFile.bytes)} detail={storage.fallbackFile.path} />
        </div>
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Server className="h-4 w-4 text-purple-400" /> Storage policy</h3>
          <p className="mt-3 text-sm leading-6 text-neutral-400">Gallery images are held in Render memory only while the POS is online. They are not written to the database and expire automatically when the POS stops refreshing them.</p>
          <p className="mt-4 text-xs text-neutral-600">Last checked: {new Date(storage.checkedAt).toLocaleString()}</p>
        </div>
      </>}
    </section>
  );
};

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5"><div className="flex items-center gap-2 text-purple-400">{icon}<span className="text-xs uppercase tracking-wider text-neutral-500">{label}</span></div><p className="mt-4 text-3xl font-semibold text-white">{value}</p><p className="mt-2 truncate text-xs text-neutral-500" title={detail}>{detail}</p></div>;
}
