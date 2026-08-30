import React, { useEffect, useState } from 'react';
import { Server, Activity, Database, Clock, Zap, RefreshCw, Cpu } from 'lucide-react';
import { SystemHealth } from '../types';

export const SystemHealthView: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      if (data.success) {
        setHealth(data.health);
      }
    } catch (error) {
      console.error('Failed to fetch system health', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    
    return parts.join(' ');
  };

  return (
    <section className="p-8 flex-1 overflow-auto flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Health</h2>
          <p className="text-sm text-neutral-400 mt-1">Real-time metrics and diagnostic status.</p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-md border border-neutral-800 transition flex items-center gap-2 text-xs font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !health ? (
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading metrics...
        </div>
      ) : health ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Uptime Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-md">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-200">Server Uptime</h3>
            </div>
            <p className="text-3xl font-bold text-white font-mono">{formatUptime(health.uptime)}</p>
            <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-500" /> Continuous operation
            </p>
          </div>

          {/* Database Status Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-md">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-200">Database Engine</h3>
            </div>
            <p className="text-lg font-medium text-white">{health.database}</p>
            <p className="text-xs text-purple-500 mt-2 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Connected & Active
            </p>
          </div>

          {/* Memory Usage Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-md">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-200">Memory Usage</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">RSS Size</span>
                <span className="font-mono font-medium text-white">{health.memory.rss}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Heap Total</span>
                <span className="font-mono font-medium text-white">{health.memory.heapTotal}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Heap Used</span>
                <span className="font-mono font-medium text-white">{health.memory.heapUsed}</span>
              </div>
            </div>
          </div>

          {/* Server Details Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 lg:col-span-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-neutral-800 text-neutral-400 rounded-md">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-200">System Environment</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black p-4 rounded-lg border border-neutral-800/50">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">API Version</p>
                <p className="text-sm font-mono text-white">v{health.version}</p>
              </div>
              <div className="bg-black p-4 rounded-lg border border-neutral-800/50">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Node Version</p>
                <p className="text-sm font-mono text-white">{health.nodeVersion}</p>
              </div>
              <div className="bg-black p-4 rounded-lg border border-neutral-800/50">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Platform</p>
                <p className="text-sm font-mono text-white">Cloud Run / Linux</p>
              </div>
              <div className="bg-black p-4 rounded-lg border border-neutral-800/50">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Server Time (UTC)</p>
                <p className="text-sm font-mono text-white">{new Date(health.timestamp).toISOString().split('T')[1].split('.')[0]}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
