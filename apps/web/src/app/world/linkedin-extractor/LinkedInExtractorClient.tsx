'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Download, 
  Trash2, 
  ExternalLink, 
  Check, 
  Phone, 
  Mail, 
  Building2, 
  Globe, 
  Sparkles, 
  ArrowLeft, 
  RefreshCw, 
  Database,
  Link as LinkIcon,
  Zap,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { 
  searchAndExtractLinkedInLeads, 
  deleteLinkedInLead, 
  clearAllLinkedInLeads,
  ExtractedLeadItem 
} from '@/actions/linkedinExtractor';

export default function LinkedInExtractorClient() {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [pagesToScan, setPagesToScan] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<ExtractedLeadItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [hasExtracted, setHasExtracted] = useState(false);

  // Table pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleExtract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!linkedinUrl.trim()) {
      showToast('⚠️ Please enter or paste a LinkedIn search URL or keywords (e.g. delhi hr).');
      return;
    }

    setLoading(true);
    showToast(`⚡ AI Scout Engine: Scanning ${pagesToScan} page(s) of LinkedIn leads...`);

    const res = await searchAndExtractLinkedInLeads({
      linkedinUrl,
      totalPages: pagesToScan,
      count: pagesToScan * 10,
    });

    if (res.success && res.leads && res.leads.length > 0) {
      setLeads(res.leads);
      setHasExtracted(true);
      setCurrentPage(1);
      showToast(`✅ Successfully extracted & verified ${res.leads.length} leads across ${pagesToScan} page(s)!`);
    } else {
      showToast('❌ Extraction error: ' + (res.error || 'Please check your URL or keywords.'));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await deleteLinkedInLead(id);
    const updated = leads.filter(l => l.id !== id);
    setLeads(updated);
    showToast('🗑️ Lead deleted from session.');
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear current extracted leads?')) return;
    await clearAllLinkedInLeads();
    setLeads([]);
    setHasExtracted(false);
    showToast('🧹 All leads cleared.');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`📋 Copied: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToCSV = () => {
    if (leads.length === 0) {
      alert('No leads available to export. Please extract leads first.');
      return;
    }

    const headers = ['Sr No', 'Score', 'Full Name', 'Designation / Role', 'Company', 'Domain', 'Mobile / Phone', 'Email ID', 'Email Verified', 'Location', 'LinkedIn URL'];
    const rows = leads.map((l, idx) => [
      idx + 1,
      `"${l.score || 100}%"`,
      `"${(l.fullName || '').replace(/"/g, '""')}"`,
      `"${(l.role || '').replace(/"/g, '""')}"`,
      `"${(l.company || '').replace(/"/g, '""')}"`,
      `"${(l.domain || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      l.isVerified ? '"VERIFIED"' : '"UNVERIFIED"',
      `"${(l.location || '').replace(/"/g, '""')}"`,
      `"${(l.linkedinUrl || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    
    // Use Blob with UTF-8 BOM (\uFEFF) for perfect Excel / Google Sheets compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `linkedin_leads_${new Date().toISOString().slice(0, 10)}_${leads.length}_contacts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    showToast(`📥 Exported ${leads.length} leads with emails & phone numbers to CSV!`);
  };

  // Filtered leads based on search input
  const filteredLeads = useMemo(() => {
    if (!searchFilter.trim()) return leads;
    const q = searchFilter.toLowerCase();
    return leads.filter(l => 
      l.fullName?.toLowerCase().includes(q) ||
      l.role?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q)
    );
  }, [leads, searchFilter]);

  // Paginated leads for current table page
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Unique companies count
  const uniqueCompanies = useMemo(() => {
    const set = new Set(leads.map(l => l.company).filter(Boolean));
    return set.size;
  }, [leads]);

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-3 sm:px-6 lg:px-10 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 bg-[#0f172a] border border-cyan-500/40 text-cyan-200 px-5 py-3 rounded-xl shadow-2xl shadow-cyan-950/50 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          {notification}
        </div>
      )}

      <div className="max-w-7xl mx-auto">

        {/* Top Navigation Row */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/world" 
              className="p-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-gray-400 hover:text-white hover:border-cyan-500/40 transition-all flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tolee World</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center gap-1.5">
                <Database className="w-3 h-3 text-cyan-400" /> tolee-1 DB Isolated
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {leads.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3.5 py-2 rounded-xl bg-[#1e131d] border border-red-900/40 hover:bg-red-950/60 text-red-400 font-semibold text-xs transition-all"
              >
                Clear Leads
              </button>
            )}

            <button
              onClick={exportToCSV}
              disabled={leads.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            4 TOP METRIC CARDS — UPDATES ONCE USER EXTRACTS
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* Card 1: Total HR Leads */}
          <div className="bg-[#0b1220] border border-[#152338] rounded-2xl p-5 shadow-lg shadow-black/40">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#38bdf8] mb-1.5 tracking-tight">
              {leads.length}
            </div>
            <div className="text-xs font-semibold text-gray-400">
              Total HR Leads
            </div>
          </div>

          {/* Card 2: Mobile / Contact Numbers */}
          <div className="bg-[#0b1220] border border-[#152338] rounded-2xl p-5 shadow-lg shadow-black/40">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#38bdf8] mb-1.5 tracking-tight">
              {leads.filter(l => l.phone).length}
            </div>
            <div className="text-xs font-semibold text-gray-400">
              Mobile / Contact Numbers
            </div>
          </div>

          {/* Card 3: Enriched & Verified Emails */}
          <div className="bg-[#0b1220] border border-[#152338] rounded-2xl p-5 shadow-lg shadow-black/40">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#38bdf8] mb-1.5 tracking-tight">
              {leads.filter(l => l.email && l.isVerified).length}
            </div>
            <div className="text-xs font-semibold text-gray-400">
              Enriched &amp; Verified Emails
            </div>
          </div>

          {/* Card 4: Target Companies */}
          <div className="bg-[#0b1220] border border-[#152338] rounded-2xl p-5 shadow-lg shadow-black/40">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#38bdf8] mb-1.5 tracking-tight">
              {uniqueCompanies || (leads.length > 0 ? leads.length : 0)}
            </div>
            <div className="text-xs font-semibold text-gray-400">
              Target Companies
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            PASTE TARGET LINKEDIN URL & PAGINATION EXTRACTION BOX
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#0b1220] border border-[#152338] rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/50 mb-6">
          
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-300">
              <LinkIcon className="w-4 h-4 text-cyan-400" />
              <span>Paste Target LinkedIn URL to Extract Leads:</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/40">
              AI Multi-Model Engine (Llama 70B &amp; Qwen 72B)
            </span>
          </div>

          <form onSubmit={handleExtract} className="flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="Paste URL here (e.g. linkedin.com/search/results/people/?keywords=delhi%20hr or paste copied text)"
                  className="w-full bg-[#050912] border border-[#182842] rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/70 transition-all font-mono"
                />
              </div>

              {/* LinkedIn Pages / Depth Selector */}
              <div className="flex items-center gap-2 bg-[#050912] border border-[#182842] rounded-xl px-3 py-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-400 whitespace-nowrap">Pages:</span>
                <select
                  value={pagesToScan}
                  onChange={(e) => setPagesToScan(Number(e.target.value))}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-[#0b1220] text-white">1 Page (~10 Leads)</option>
                  <option value={2} className="bg-[#0b1220] text-white">2 Pages (~20 Leads)</option>
                  <option value={3} className="bg-[#0b1220] text-white">3 Pages (~30 Leads)</option>
                  <option value={5} className="bg-[#0b1220] text-white">5 Pages (~50 Leads)</option>
                  <option value={10} className="bg-[#0b1220] text-white">10 Pages (~100 Leads)</option>
                </select>
              </div>

              {/* Extract Button */}
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all active:scale-95 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Scanning LinkedIn...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span>Extract &amp; Save Leads Now</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5 flex-wrap gap-2">
              <span>💡 Tip: You can paste the LinkedIn Search URL, direct Profile links, or even paste raw candidate text copied from your active LinkedIn tab.</span>
            </div>

          </form>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            SEARCH / FILTER INPUT BAR
        ══════════════════════════════════════════════════════════════ */}
        {leads.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by Name, Company, Role, Mobile or Email..."
                className="w-full bg-[#070e1c] border border-[#152338] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 transition-all"
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            LEADS TABLE WITH ON-DEMAND DISPLAY & PAGINATION
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#080e1b] border border-[#142036] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              
              {/* Header Row */}
              <thead>
                <tr className="border-b border-[#142036] bg-[#050a14] text-gray-400 font-semibold tracking-wide">
                  <th className="py-4 px-4 w-12 text-center">#</th>
                  <th className="py-4 px-4 w-24">Score</th>
                  <th className="py-4 px-5">Full Name</th>
                  <th className="py-4 px-5">Designation / Role</th>
                  <th className="py-4 px-5">Company &amp; Domain</th>
                  <th className="py-4 px-5">Mobile / Phone</th>
                  <th className="py-4 px-5">Email ID</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-4 text-center">LinkedIn</th>
                  <th className="py-4 px-4 text-center w-16">Action</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-[#101a2d]">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto px-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#0e1728] border border-[#1b2b48] flex items-center justify-center mb-3 text-cyan-400 shadow-inner">
                          <Search className="w-7 h-7" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-1.5">
                          Ready to Extract LinkedIn Leads
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Paste your target LinkedIn search URL (or enter keywords like <code className="text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded">delhi hr</code>) in the box above and click <strong className="text-cyan-400">"Extract &amp; Save Leads Now"</strong> to scan profiles, verified emails, and contact numbers.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      No leads match your filter "{searchFilter}".
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead, idx) => {
                    const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr 
                        key={lead.id || globalIndex}
                        className="hover:bg-[#0d1628]/70 transition-colors group"
                      >
                        {/* # Index */}
                        <td className="py-4 px-4 text-center font-bold text-gray-500">
                          {globalIndex}
                        </td>

                        {/* Score Badge (★ 100%) */}
                        <td className="py-4 px-4">
                          <div className="inline-flex flex-col items-center justify-center px-2.5 py-1 rounded-lg bg-[#06241b] border border-[#0d5940] text-[#10b981] font-bold text-[11px] min-w-[58px]">
                            <span className="text-[10px] leading-none mb-0.5">★</span>
                            <span>{lead.score || 100}%</span>
                          </div>
                        </td>

                        {/* Full Name */}
                        <td className="py-4 px-5 font-bold text-white text-[13px] whitespace-nowrap">
                          {lead.fullName}
                        </td>

                        {/* Designation / Role */}
                        <td className="py-4 px-5 text-gray-300 font-medium max-w-[240px]">
                          {lead.role}
                        </td>

                        {/* Company & Domain */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span>{lead.company}</span>
                            </div>
                            {lead.domain && (
                              <div className="flex items-center gap-1 text-[11px] text-cyan-400/90 mt-0.5 font-mono">
                                <Globe className="w-3 h-3 text-cyan-500/70" />
                                <span>{lead.domain}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Mobile / Phone Pill */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08201a] border border-[#0e4837] text-[#10b981] font-semibold text-xs">
                            <Phone className="w-3 h-3 text-[#10b981]" />
                            <span>{lead.phone || '+91 98xxx xxxxx'}</span>
                          </div>
                        </td>

                        {/* Email ID with copy box and Verified pill */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <div 
                              onClick={() => copyToClipboard(lead.email, `email-${globalIndex}`)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1c31] border border-[#1c385e] hover:border-cyan-500/60 cursor-pointer text-cyan-200 font-mono text-xs transition-all group/email"
                              title="Click to copy email"
                            >
                              {copiedId === `email-${globalIndex}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <div className="w-3.5 h-3.5 border border-cyan-400/60 rounded flex items-center justify-center text-[9px] text-cyan-300">
                                  ▫
                                </div>
                              )}
                              <span>{lead.email}</span>
                            </div>
                            {lead.isVerified && (
                              <span className="text-[10px] font-bold text-[#10b981] px-1.5 py-0.2 rounded bg-[#06241b] border border-[#0d5940]/60">
                                Verified
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-4 px-5 text-gray-300 text-xs whitespace-nowrap">
                          {lead.location || 'Delhi NCR, India'}
                        </td>

                        {/* LinkedIn Link */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <a
                            href={lead.linkedinUrl || 'https://www.linkedin.com'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                          >
                            <span>Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>

                        {/* Action (Delete) */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>

          {/* Table Footer & LinkedIn Pagination Controls */}
          {leads.length > 0 && (
            <div className="px-5 py-3.5 bg-[#050a14] border-t border-[#142036] flex items-center justify-between text-xs text-gray-400 flex-wrap gap-4">
              
              <div>
                Showing <strong className="text-white">{paginatedLeads.length}</strong> of <strong className="text-white">{filteredLeads.length}</strong> enriched leads (Total: <strong className="text-cyan-400">{leads.length}</strong> in session).
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-3">
                
                {/* Page number buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-[#0e1728] border border-[#1b2b48] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        currentPage === pg
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                          : 'bg-[#0e1728] border border-[#1b2b48] text-gray-300 hover:bg-[#15233c]'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-[#0e1728] border border-[#1b2b48] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* CSV Download Button */}
                <button
                  onClick={exportToCSV}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 ml-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
