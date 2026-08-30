/**
 * CafeTable Component
 * Shows the table of all cafes with copyable API key inputs, status badges, and suspend/activate toggle actions.
 */

import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, ShieldAlert, Store, AlertCircle } from 'lucide-react';
import { Cafe } from '../types';

interface CafeTableProps {
  cafes: Cafe[];
  loading: boolean;
  onToggleStatus: (cafe: Cafe) => Promise<void>;
  actionLoadingId: number | null;
}

export const CafeTable: React.FC<CafeTableProps> = ({
  cafes,
  loading,
  onToggleStatus,
  actionLoadingId,
}) => {
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);

  const handleCopy = async (id: number, key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      console.error('Failed to copy API key: ', err);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (loading && cafes.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-neutral-400">Loading registered cafes from database...</p>
      </div>
    );
  }

  if (cafes.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <Store className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">No Cafes Found</h3>
        <p className="text-sm text-neutral-400 max-w-sm mx-auto mb-6">
          Waiting for POS clients to auto-register. Terminals will appear here automatically when they connect to the registration endpoint for the first time.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-neutral-900 border-b border-neutral-800 text-[11px] uppercase text-neutral-500 font-semibold tracking-wider z-10">
          <tr>
            <th className="px-6 py-4 font-semibold text-neutral-300">ID</th>
            <th className="px-6 py-4 font-semibold text-neutral-300">Cafe Name</th>
            <th className="px-6 py-4 font-semibold text-neutral-300">Owner Name</th>
            <th className="px-6 py-4 font-semibold text-neutral-300">Email</th>
            <th className="px-6 py-4 font-semibold text-neutral-300 min-w-[280px]">API Key</th>
            <th className="px-6 py-4 font-semibold text-neutral-300 text-center">Status</th>
            <th className="px-6 py-4 font-semibold text-neutral-300">Date Joined</th>
            <th className="px-6 py-4 font-semibold text-neutral-300 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-neutral-800">
          {cafes.map((cafe) => {
            const isActionLoading = actionLoadingId === cafe.id;
            const isActive = cafe.status === 'active';
            const isCopied = copiedKeyId === cafe.id;

            return (
              <tr
                key={cafe.id}
                id={`cafe-row-${cafe.id}`}
                className="hover:bg-neutral-800/30 transition-colors group"
              >
                {/* ID */}
                <td className="px-6 py-4 font-mono text-neutral-500">
                  #{cafe.id}
                </td>

                {/* Cafe Name */}
                <td className="px-6 py-4 font-medium text-neutral-100">
                  <div className="flex items-center gap-2">
                    <span>{cafe.cafe_name}</span>
                  </div>
                </td>

                {/* Owner Name */}
                <td className="px-6 py-4 text-neutral-300">
                  {cafe.owner_name}
                </td>

                {/* Email */}
                <td className="px-6 py-4 text-neutral-400 font-mono text-xs">
                  {cafe.email}
                </td>

                {/* API Key (Copyable text box) */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 max-w-[270px]">
                    <input
                      id={`api-key-input-${cafe.id}`}
                      type="text"
                      readOnly
                      value={cafe.api_key}
                      aria-label={`API Key for ${cafe.cafe_name}`}
                      className="w-full bg-black border border-neutral-800 px-3 py-1.5 rounded text-xs font-mono text-neutral-300 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button
                      id={`copy-key-btn-${cafe.id}`}
                      type="button"
                      onClick={() => handleCopy(cafe.id, cafe.api_key)}
                      title="Copy API Key"
                      className={`p-1.5 rounded transition shrink-0 ${
                        isCopied
                          ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border-transparent'
                      } border`}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="px-6 py-4 text-center">
                  {isActive ? (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-500/10 text-purple-500 border border-purple-500/20">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      Suspended
                    </span>
                  )}
                </td>

                {/* Date Joined */}
                <td className="px-6 py-4 text-xs text-neutral-500 whitespace-nowrap">
                  {formatDate(cafe.created_at)}
                </td>

                {/* Action Button */}
                <td className="px-6 py-4 text-right">
                  {isActive ? (
                    <button
                      id={`suspend-btn-${cafe.id}`}
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => onToggleStatus(cafe)}
                      className="px-3 py-1.5 text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded border border-rose-500/20 transition disabled:opacity-50"
                    >
                      {isActionLoading ? (
                        <span className="inline-block w-3 h-3 border border-rose-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Suspend'
                      )}
                    </button>
                  ) : (
                    <button
                      id={`activate-btn-${cafe.id}`}
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => onToggleStatus(cafe)}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded border border-purple-500/20 transition disabled:opacity-50"
                    >
                      {isActionLoading ? (
                        <span className="inline-block w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Activate'
                      )}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
