'use client';

import React from 'react';
import Link from 'next/link';
import { GroupCreditSummaryDto } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Users, Plus, ShieldCheck, ArrowRight } from 'lucide-react';

interface GroupRevenueDashboardProps {
  groups: GroupCreditSummaryDto[];
  onConnectGroup: (toleeId: string) => void;
  onOpenCreateGroupTerms?: () => void;
}

export function GroupRevenueDashboard({ groups, onConnectGroup, onOpenCreateGroupTerms }: GroupRevenueDashboardProps) {
  return (
    <div id="tolee-credit-groups-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>Your Connected Groups</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-teal-500/10 text-teal-600 dark:text-teal-400">
              {groups.length}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Groups you created that generate eligible advertising revenue share.
          </p>
        </div>

        <button
          onClick={onOpenCreateGroupTerms || (() => {})}
          className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Tolee</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="p-8 rounded-3xl bg-zinc-50 dark:bg-[#0c1220] border border-zinc-200 dark:border-[#16233a] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto text-xl font-bold">
            👥
          </div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">No Groups Found</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Create your community and start building your Tolee network to earn eligible ad revenue.
          </p>
          <button
            onClick={onOpenCreateGroupTerms || (() => {})}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Tolee</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <div
              key={group.toleeId}
              className="p-5 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] shadow-xs hover:shadow-md transition-all space-y-4"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden bg-teal-500/10 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                    {group.toleeAvatar ? (
                      <img src={group.toleeAvatar} alt={group.toleeName} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/t/${group.toleeSlug}`}
                      className="font-bold text-sm text-zinc-900 dark:text-white hover:underline block leading-tight"
                    >
                      {group.toleeName}
                    </Link>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" />
                      <span>{group.memberCount} Members</span>
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  {group.revenueSharePercent}% Share
                </span>
              </div>

              {/* Earnings Breakdown */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#070b14] border border-zinc-100 dark:border-[#121c2e] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium">Revenue Generated</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                    {formatCurrency(group.totalRevenueGenerated)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 block font-medium">Your Share Earned</span>
                  <span className="font-extrabold text-teal-600 dark:text-teal-400 text-sm">
                    {formatCurrency(group.totalAdminShareEarned)}
                  </span>
                </div>
              </div>

              {/* Status & Link */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Monetization Connected</span>
                </span>

                <Link
                  href={`/t/${group.toleeSlug}`}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center gap-1"
                >
                  <span>View Group</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
