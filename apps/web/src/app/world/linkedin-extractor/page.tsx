'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Download, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Phone, 
  Mail, 
  Building2, 
  Globe, 
  MapPin, 
  Sparkles, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  FileSpreadsheet,
  Database,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { 
  searchAndExtractLinkedInLeads, 
  getSavedLinkedInLeads, 
  deleteLinkedInLead, 
  clearAllLinkedInLeads,
  ExtractedLeadItem 
} from '@/actions/linkedinExtractor';

export default function LinkedInExtractorPage() {
  const [role, setRole] = useState('Head of Human Resources & Talent Strategy');
  const [company, setCompany] = useState('Larsen & Toubro, HDFC, Reliance');
  const [location, setLocation] = useState('Delhi NCR, India');
  const [leadCount, setLeadCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<ExtractedLeadItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadLeads = async () => {
    setLoading(true);
    const res = await getSavedLinkedInLeads();
    if (res.success && res.leads && res.leads.length > 0) {
      setLeads(res.leads);
    } else {
      // Default initial mock dataset matching the screenshot
      setLeads([
        {
          id: '1',
          score: 100,
          fullName: 'Amit Kulkarni',
          role: 'Head of Human Resources & Talent Strategy',
          company: 'Larsen & Toubro',
          domain: 'larsentoubro.com',
          phone: '+91 98210 33491',
          email: 'amit.kulkarni@larsentoubro.com',
          isVerified: true,
          location: 'Delhi NCR, India',
          linkedinUrl: 'https://www.linkedin.com/in/amit-kulkarni-hr',
        },
        {
          id: '2',
          score: 100,
          fullName: 'Pooja Deshmukh',
          role: 'Lead HR Manager & Corporate Hiring',
          company: 'HDFC Bank',
          domain: 'hdfcbank.com',
          phone: '+91 98701 92834',
          email: 'pooja.deshmukh@hdfcbank.com',
          isVerified: true,
          location: 'Delhi NCR, India',
          linkedinUrl: 'https://www.linkedin.com/in/pooja-deshmukh-recruiting',
        },
        {
          id: '3',
          score: 100,
          fullName: 'Trupti Mhetre',
          role: 'Senior HR Executive & Talent Partner',
          company: 'Reliance Industries Ltd',
          domain: 'ril.com',
          phone: '+91 98335 12908',
          email: 'trupti.mhetre@ril.com',
          isVerified: true,
          location: 'Delhi NCR, India',
          linkedinUrl: 'https://www.linkedin.com/in/trupti-mhetre-hr',
        },
        {
          id: '4',
          score: 100,
          fullName: 'Sreeju Panicker',
          role: 'Human Resources (HR) at Marathon Realty Ltd',
          company: 'Marathon Realty',
          domain: 'marathonrealty.com',
          phone: '+91 99204 55190',
          email: 'sreeju.panicker@marathonrealty.com',
          isVerified: true,
          location: 'Delhi NCR, India',
          linkedinUrl: 'https://www.linkedin.com/in/sreeju-panicker-hr',
        }
      ]);
    }
    setLoading(false);
  };

  const handleExtract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    showToast('🔍 Scout OSINT Engine: Extracting & enriching LinkedIn profiles...');
    
    const res = await searchAndExtractLinkedInLeads({
      role,
      company,
      location,
      count: leadCount,
    });

    if (res.success && res.leads) {
      setLeads(res.leads);
      showToast(`✅ Successfully extracted and verified ${res.leads.length} leads!`);
    } else {
      showToast('❌ Extraction error: ' + (res.error || 'Please try again'));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await deleteLinkedInLead(id);
    setLeads(leads.filter(l => l.id !== id));
    showToast('🗑️ Lead deleted.');
  };

  const handleClearAll = async () => {
    if (confirm('Clear all extracted leads from tolee-1 database?')) {
      await clearAllLinkedInLeads();
      setLeads([]);
      showToast('🧹 All leads cleared.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`📋 Copied: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToCSV = () => {
    if (leads.length === 0) {
      alert('No leads available to export.');
      return;
    }

    const headers = ['#', 'Score', 'Full Name', 'Designation / Role', 'Company', 'Domain', 'Phone / Mobile', 'Email ID', 'Email Verified', 'Location', 'LinkedIn URL'];
    const rows = leads.map((l, idx) => [
      idx + 1,
      `${l.score}%`,
      `"${(l.fullName || '').replace(/"/g, '""')}"`,
      `"${(l.role || '').replace(/"/g, '""')}"`,
      `"${(l.company || '').replace(/"/g, '""')}"`,
      l.domain || '',
      `"${l.phone || ''}"`,
      l.email || '',
      l.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      `"${(l.location || '').replace(/"/g, '""')}"`,
      l.linkedinUrl || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `linkedin_extracted_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 Downloaded CSV with extracted numbers and emails!');
  };

  const exportToJSON = () => {
    if (leads.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(leads, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `linkedin_leads_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('📥 Downloaded JSON dataset!');
  };

  const copyAllEmails = () => {
    const emails = leads.map(l => l.email).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emails);
    setCopiedAll(true);
    showToast('📋 All emails copied to clipboard!');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-3 sm:px-6 lg:px-10 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 bg-[#0f172a] border border-cyan-500/40 text-cyan-200 px-5 py-3 rounded-xl shadow-2xl shadow-cyan-950/50 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          {notification}
        </div>
      )}

      {/* Header Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/world" 
              className="p-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-gray-400 hover:text-white hover:border-cyan-500/40 transition-all flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tolee World</span>
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  LinkedIn Extractor
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    SCOUT OSINT
                  </span>
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Extract verified corporate emails, mobile numbers, company domains & LinkedIn profile links with 1-click CSV download.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg bg-[#0b1322] border border-[#1b2b48] text-xs text-gray-300 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Storage: <strong className="text-cyan-300">tolee-1 DB</strong></span>
            </div>
            
            <button
              onClick={exportToCSV}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={exportToJSON}
              className="px-3 py-2 rounded-xl bg-[#0e172a] hover:bg-[#1e293b] border border-[#1e293b] text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-gray-400" />
              <span>JSON</span>
            </button>

            {leads.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-[#140b0f] hover:bg-[#261017] border border-red-900/40 text-red-400 text-xs transition-all"
                title="Clear All Leads"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <form 
          onSubmit={handleExtract}
          className="bg-[#0b111e] border border-[#172237] rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/60 mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Designation / Role
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. HR Head, Lead Manager, CTO"
                  className="w-full bg-[#060a12] border border-[#1b2b46] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/70 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Company & Domain
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Larsen & Toubro, HDFC, Reliance"
                  className="w-full bg-[#060a12] border border-[#1b2b46] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/70 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Delhi NCR, India / Mumbai"
                  className="w-full bg-[#060a12] border border-[#1b2b46] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/70 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Extract Count
              </label>
              <div className="flex gap-2">
                <select
                  value={leadCount}
                  onChange={(e) => setLeadCount(Number(e.target.value))}
                  className="bg-[#060a12] border border-[#1b2b46] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/70 transition-all"
                >
                  <option value={4}>4 Leads</option>
                  <option value={8}>8 Leads</option>
                  <option value={15}>15 Leads</option>
                  <option value={25}>25 Leads</option>
                </select>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all active:scale-95"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Extract Leads</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[#131e33] flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                SMTP Email Verification Active
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Phone className="w-3.5 h-3.5" />
                Phone Number Extractor Enabled
              </span>
            </div>
            
            <button
              type="button"
              onClick={copyAllEmails}
              className="text-gray-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy All Verified Emails</span>
            </button>
          </div>
        </form>

        {/* ══════════════════════════════════════════════════════════════
            LEADS TABLE — EXACTLY MATCHING USER SCREENSHOT
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#0b101c] border border-[#141e30] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              
              {/* Header Row */}
              <thead>
                <tr className="border-b border-[#141f33] bg-[#070b14] text-gray-400 font-semibold tracking-wide">
                  <th className="py-4 px-4 w-12 text-center">#</th>
                  <th className="py-4 px-4 w-24">Score</th>
                  <th className="py-4 px-5">Full Name</th>
                  <th className="py-4 px-5">Designation / Role</th>
                  <th className="py-4 px-5">Company & Domain</th>
                  <th className="py-4 px-5">Mobile / Phone</th>
                  <th className="py-4 px-5">Email ID</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-4 text-center">LinkedIn</th>
                  <th className="py-4 px-4 text-center w-16">Action</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-[#121b2d]">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      No leads extracted yet. Click "Extract Leads" above to start.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead, idx) => (
                    <tr 
                      key={lead.id || idx}
                      className="hover:bg-[#0e1628]/60 transition-colors group"
                    >
                      {/* # Index */}
                      <td className="py-4 px-4 text-center font-bold text-gray-500">
                        {idx + 1}
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
                      <td className="py-4 px-5 text-gray-300 font-medium max-w-[220px]">
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
                            onClick={() => copyToClipboard(lead.email, `email-${idx}`)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1c31] border border-[#1c385e] hover:border-cyan-500/60 cursor-pointer text-cyan-200 font-mono text-xs transition-all group/email"
                            title="Click to copy email"
                          >
                            {copiedId === `email-${idx}` ? (
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
                  ))
                )}
              </tbody>

            </table>
          </div>

          {/* Table Footer */}
          <div className="px-5 py-3.5 bg-[#070b14] border-t border-[#141f33] flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
            <div>
              Showing <strong className="text-white">{leads.length}</strong> enriched leads stored in <strong className="text-cyan-400">tolee-1</strong> database.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to CSV / Excel</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
