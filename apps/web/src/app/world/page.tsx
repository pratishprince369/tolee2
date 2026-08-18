'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Globe, 
  Search,
  Sparkles, 
  ArrowRight, 
  Database,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
  FileSpreadsheet,
  Cpu,
  Layers,
  Download
} from 'lucide-react';

export default function WorldDashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-200 p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 text-sm font-medium animate-pulse">Loading Tolee World...</p>
      </div>
    );
  }

  const activeApps = [
    {
      id: 'linkedin-extractor',
      title: 'LinkedIn Extractor',
      category: 'Scout OSINT & Lead Intelligence',
      description: 'Search & extract verified corporate emails, mobile phone numbers, company domains, and LinkedIn public profiles with 1-click CSV/JSON export.',
      route: '/world/linkedin-extractor',
      icon: Search,
      iconBg: 'bg-cyan-950/80 border border-cyan-800/50',
      iconColor: 'text-cyan-400',
      badge: 'Scout OSINT',
      badgeColor: 'bg-cyan-950 text-cyan-300 border border-cyan-800/60',
      dbTag: 'tolee-1 DB',
      stats: 'Phone + Email + CSV Export',
      highlight: true
    }
  ];

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-4 sm:px-6 lg:px-10 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      <div className="max-w-6xl mx-auto">

        {/* ═══════════════════════════════════════════
            HERO SECTION
        ════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-[#141e33]">
          
          <div className="flex items-center gap-5">
            {/* Circular Gradient Logo Badge */}
            <div className="relative flex-shrink-0">
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-[2px]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #10b981)' }}
              >
                <div className="w-full h-full rounded-2xl bg-[#0a0f1d] flex flex-col items-center justify-center shadow-inner">
                  <Globe className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  APPS & TOOLS STUDIO
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" /> tolee-1 DB Isolated
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Tolee World
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
                Modular applications and OSINT lead generation workspace. Each app runs with dedicated storage on the secondary database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/world/linkedin-extractor"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span>Launch LinkedIn Extractor</span>
            </Link>
          </div>

        </div>

        {/* ═══════════════════════════════════════════
            APPS GRID
        ════════════════════════════════════════════ */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs sm:text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Active Studio Applications ({activeApps.length})
            </h2>
            <span className="text-xs text-gray-500">
              Folder Architecture: <code className="text-cyan-400/90 text-[11px]">/src/app/world/[app-slug]</code>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeApps.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  onClick={() => router.push(app.route)}
                  className="bg-[#0b101c] border border-[#17243b] hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col justify-between hover:shadow-2xl hover:shadow-cyan-950/30 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle Glow Background */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />

                  <div>
                    {/* Top Row: Icon + Badges */}
                    <div className="flex justify-between items-start mb-5">
                      <div className={`w-12 h-12 rounded-xl ${app.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className={`w-6 h-6 ${app.iconColor}`} />
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${app.badgeColor}`}>
                          {app.badge}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1">
                          <Database className="w-2.5 h-2.5 text-cyan-400" /> {app.dbTag}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-cyan-400/90 uppercase tracking-wider mb-1">
                      {app.category}
                    </div>

                    <h3 className="font-bold text-white text-lg mb-2 group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                      <span>{app.title}</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                    </h3>

                    <p className="text-xs text-gray-400 leading-relaxed mb-5">
                      {app.description}
                    </p>

                    {/* Features Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#071722] text-cyan-300 border border-cyan-900/50">
                        <Phone className="w-2.5 h-2.5" /> Mobile Extraction
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#061e17] text-emerald-300 border border-emerald-900/50">
                        <Mail className="w-2.5 h-2.5" /> Email Verification
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#161726] text-indigo-300 border border-indigo-900/50">
                        <FileSpreadsheet className="w-2.5 h-2.5" /> CSV Download
                      </span>
                    </div>
                  </div>

                  {/* Launch Action */}
                  <div className="pt-4 border-t border-[#131d2e] flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300 inline-flex items-center gap-1.5">
                      Open Tool <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-[11px] text-gray-500">
                      1-Click Download
                    </span>
                  </div>

                </div>
              );
            })}

            {/* Placeholder for Next App in Workspace */}
            <div className="bg-[#070b13] border border-dashed border-[#182338] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#0e1628] border border-[#1b2a44] flex items-center justify-center mb-3">
                <Layers className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="font-bold text-gray-300 text-sm mb-1">
                Modular App Slot
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mb-3">
                New apps and tools requested will be provisioned directly into their dedicated folders on the server.
              </p>
              <span className="text-[10px] font-mono text-cyan-500/80 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-900/40">
                Ready for next tool
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
