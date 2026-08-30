/**
 * Super Admin Panel - Main Application Component
 * 
 * Manages:
 * - Admin authentication state
 * - Fetching and listing all cafes
 * - Real-time metrics (Total, Active, Suspended)
 * - Toggling Cafe Status (Activate / Suspend)
 * - Adding new cafe and launching the API Key generation popup
 * - POS Verification API tester & Python code viewer
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  LogOut,
  Search,
  Terminal,
  RefreshCw,
  Store,
  CheckCircle2,
  AlertOctagon,
  Users,
} from 'lucide-react';
import { Cafe, AdminCounts } from './types';
import { LoginView } from './components/LoginView';
import { CafeTable } from './components/CafeTable';
import { PosTesterModal } from './components/PosTesterModal';
import { SecurityLogsView } from './components/SecurityLogsView';
import { SystemHealthView } from './components/SystemHealthView';
import { CafeLiveDashboard } from './components/CafeLiveDashboard';
import { SuspendAuthModal } from './components/SuspendAuthModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'logs' | 'health' | 'live'>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<{ username: string } | null>(null);

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [counts, setCounts] = useState<AdminCounts>({ total: 0, active: 0, suspended: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modals state
  const [isPosTesterOpen, setIsPosTesterOpen] = useState<boolean>(false);
  const [suspendModalCafe, setSuspendModalCafe] = useState<Cafe | null>(null);

  // Check authentication status on startup
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/me', { headers });
      const data = await res.json();

      if (data.authenticated) {
        setIsAuthenticated(true);
        setAdminUser(data.user);
      } else {
        setIsAuthenticated(false);
        setAdminUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setAdminUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch cafes list from backend
  const fetchCafes = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/cafes', { headers });
      if (res.status === 401 || res.status === 403) {
        setIsAuthenticated(false);
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.cafes)) {
        setCafes(data.cafes);
        if (data.counts) {
          setCounts(data.counts);
        } else {
          setCounts({
            total: data.cafes.length,
            active: data.cafes.filter((c: Cafe) => c.status === 'active').length,
            suspended: data.cafes.filter((c: Cafe) => c.status === 'suspended').length,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch cafes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCafes();
    }
  }, [isAuthenticated, fetchCafes]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('admin_token');
      setIsAuthenticated(false);
      setAdminUser(null);
    }
  };

  // Actually perform the toggle (called directly for activate, or after auth for suspend)
  const performToggleStatus = async (cafe: Cafe) => {
    const isActivating = cafe.status === 'suspended';
    const endpoint = isActivating
      ? `/api/admin/cafes/${cafe.id}/activate`
      : `/api/admin/cafes/${cafe.id}/suspend`;

    setActionLoadingId(cafe.id);

    try {
      const token = localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update status');
      }

      // Update state locally
      setCafes((prev) =>
        prev.map((c) =>
          c.id === cafe.id
            ? { ...c, status: isActivating ? 'active' : 'suspended' }
            : c
        )
      );

      // Update counts
      setCounts((prev) => ({
        ...prev,
        active: isActivating ? prev.active + 1 : prev.active - 1,
        suspended: isActivating ? prev.suspended - 1 : prev.suspended + 1,
      }));
    } catch (err: any) {
      alert(err.message || 'Error updating cafe status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle Cafe Status Click Handler
  const handleToggleStatusClick = async (cafe: Cafe) => {
    const isActivating = cafe.status === 'suspended';
    if (isActivating) {
      await performToggleStatus(cafe);
    } else {
      setSuspendModalCafe(cafe);
    }
  };

  // Filtered cafes based on search & tab
  const filteredCafes = cafes.filter((cafe) => {
    const matchesSearch =
      cafe.cafe_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.api_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(cafe.id).includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all' ? true : cafe.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Initial loading state while checking session
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated, display login screen
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setAdminUser(user);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-black text-neutral-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-xl font-bold tracking-tight text-purple-500">
            AIRAVOTO<span className="text-white">HEAD</span>
          </h1>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
            Super Admin Console
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setCurrentTab('live')}
            className={`w-full flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'live'
                ? 'bg-neutral-800 border-l-2 border-purple-500 text-white'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            Live Monitor
          </button>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`w-full flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'dashboard'
                ? 'bg-neutral-800 border-l-2 border-purple-500 text-white'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            Dashboard / Cafes
          </button>
          <button
            onClick={() => setCurrentTab('logs')}
            className={`w-full flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'logs'
                ? 'bg-neutral-800 border-l-2 border-purple-500 text-white'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            Security Logs
          </button>
          <button
            onClick={() => setCurrentTab('health')}
            className={`w-full flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'health'
                ? 'bg-neutral-800 border-l-2 border-purple-500 text-white'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            System Health
          </button>
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <div className="bg-neutral-800/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-neutral-500 mb-2 italic">Python POS Snippet</p>
            <code className="text-[10px] text-neutral-300 block bg-black/40 p-2 rounded leading-relaxed">
              import requests<br />
              r = requests.get('/api/pos/verify', params=&#123;'id':4, 'key': '...'&#125;)
            </code>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center border border-neutral-600 text-xs font-medium">SA</div>
              <span className="text-xs text-neutral-400 font-mono">{adminUser?.username || 'admin'}</span>
            </div>
            <button
              id="admin-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-neutral-900/50 border-b border-neutral-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500 uppercase">Total Cafes</span>
              <span className="text-xl font-semibold">{counts.total}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-purple-500 uppercase">Active</span>
              <span className="text-xl font-semibold">{counts.active}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-rose-500 uppercase">Suspended</span>
              <span className="text-xl font-semibold">{counts.suspended}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              id="open-pos-tester-btn"
              onClick={() => setIsPosTesterOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-neutral-400 hover:text-neutral-200 transition text-sm font-medium"
            >
              <Terminal className="w-4 h-4" />
              <span>API Tester</span>
            </button>
          </div>
        </header>

        {currentTab === 'dashboard' && (
          <section className="p-8 flex-1 overflow-hidden flex flex-col animate-in fade-in duration-200">
            {/* Search, Filters, & Refresh Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="cafe-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by cafe, owner, email, or key..."
                  className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Status Filter Tabs & Refresh */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="inline-flex rounded-md bg-neutral-900 p-1 border border-neutral-800">
                  <button
                    id="filter-all-btn"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      statusFilter === 'all'
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    All ({counts.total})
                  </button>
                  <button
                    id="filter-active-btn"
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      statusFilter === 'active'
                        ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Active ({counts.active})
                  </button>
                  <button
                    id="filter-suspended-btn"
                    onClick={() => setStatusFilter('suspended')}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      statusFilter === 'suspended'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Suspended ({counts.suspended})
                  </button>
                </div>

                <button
                  id="refresh-cafes-btn"
                  onClick={fetchCafes}
                  disabled={loading}
                  title="Refresh cafes"
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-md border border-neutral-800 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col flex-1 overflow-hidden">
              <CafeTable
                cafes={filteredCafes}
                loading={loading}
                onToggleStatus={handleToggleStatusClick}
                actionLoadingId={actionLoadingId}
              />
            </div>
          </section>
        )}

        {currentTab === 'logs' && (
          <div className="animate-in fade-in duration-200 flex-1 flex flex-col overflow-hidden">
            <SecurityLogsView />
          </div>
        )}

        {currentTab === 'health' && (
          <div className="animate-in fade-in duration-200 flex-1 flex flex-col overflow-hidden">
            <SystemHealthView />
          </div>
        )}

        {currentTab === 'live' && (
          <div className="animate-in fade-in duration-200 flex-1 flex flex-col overflow-hidden">
            <CafeLiveDashboard />
          </div>
        )}
      </main>

      {/* Modal: Suspend Authentication */}
      <SuspendAuthModal
        cafe={suspendModalCafe}
        isOpen={!!suspendModalCafe}
        onClose={() => setSuspendModalCafe(null)}
        onConfirm={performToggleStatus}
      />

      {/* 1. Modal: POS Verification Tester & Python Code */}
      <PosTesterModal
        isOpen={isPosTesterOpen}
        onClose={() => setIsPosTesterOpen(false)}
        cafes={cafes}
      />
    </div>
  );
}
