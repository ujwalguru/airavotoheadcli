import React from 'react';
import type { CafeMembershipPlan } from '../types';

interface CafeMembershipPlansPanelProps {
  plans: CafeMembershipPlan[];
}

function formatMembershipPrice(value: number): string {
  const price = Number(value);
  return Number.isFinite(price)
    ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : 'Price unavailable';
}

export const CafeMembershipPlansPanel: React.FC<CafeMembershipPlansPanelProps> = ({ plans }) => {
  if (!Array.isArray(plans) || plans.length === 0) return null;

  return (
    <section aria-label="Membership plans" className="lg:col-span-2 bg-black border border-neutral-800 rounded-lg p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Membership Plans</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {plans.map((plan, index) => {
          const benefits = String(plan.benefits || '').trim();
          const notice = String(plan.notice || '').trim();
          return (
            <article key={plan.id || `${plan.name}-${index}`} className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h5 className="text-sm font-semibold text-white">{plan.name}</h5>
                  <span className="mt-1 inline-flex rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-300">
                    {plan.category || 'All categories'}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Membership price</span>
                  <span className="text-lg font-bold text-emerald-400">{formatMembershipPrice(plan.membershipPrice)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-neutral-900 p-2">
                  <span className="block text-[10px] uppercase text-neutral-500">Duration</span>
                  <span className="text-neutral-200">{plan.duration || '—'}</span>
                </div>
                <div className="rounded bg-neutral-900 p-2">
                  <span className="block text-[10px] uppercase text-neutral-500">Validity</span>
                  <span className="text-neutral-200">{plan.validity || '—'}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Benefits</span>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-neutral-300">{benefits || 'No benefits listed.'}</p>
              </div>
              <div role="note" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">Important notice</span>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-amber-100/90">{notice || 'No additional notice provided.'}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
