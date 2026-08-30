import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { SystemLog } from '../types';

export const SecurityLogsView: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-purple-500" />;
    }
  };

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'warn':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    }
  };

  return (
    <section className="p-8 flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Security & Event Logs</h2>
          <p className="text-sm text-neutral-400 mt-1">Real-time system events, POS verifications, and admin actions.</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-md border border-neutral-800 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col flex-1 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-neutral-400">Loading system logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-neutral-400">No logs found. Start interacting with the system.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-neutral-900 border-b border-neutral-800 text-[11px] uppercase text-neutral-500 font-semibold tracking-wider z-10">
                <tr>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-neutral-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getLevelStyles(log.level)}`}>
                        {getLevelIcon(log.level)}
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-400 font-mono text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral-200 whitespace-nowrap">
                      {log.event}
                    </td>
                    <td className="px-6 py-4 text-neutral-400 text-xs">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
