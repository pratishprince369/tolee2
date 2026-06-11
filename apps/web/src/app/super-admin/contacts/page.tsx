'use client';

import React, { useEffect, useState } from 'react';
import { getContactQueries, deleteContactQuery } from '@/actions/contact';
import { Mail, Phone, User, Calendar, Trash2, ChevronDown, ChevronUp, Search, Filter, HelpCircle, AlertTriangle, Briefcase, RefreshCw } from 'lucide-react';

export default function SuperAdminContactsPage() {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Query' | 'Complaint' | 'Career'>('all');
  
  // Expanded messages state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Delete action loading state
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchQueries = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getContactQueries();
      if (res.success) {
        setQueries(res.data || []);
      } else {
        setError(res.error || 'Failed to fetch contact queries.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while loading queries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact query permanently?')) return;
    setDeleteLoading(id);
    try {
      const res = await deleteContactQuery(id);
      if (res.success) {
        setQueries(prev => prev.filter(q => q.id !== id));
      } else {
        alert(res.error || 'Failed to delete contact query.');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Filtered queries logic
  const filteredQueries = queries.filter(q => {
    const matchesType = typeFilter === 'all' || q.optionType === typeFilter;
    const matchesSearch = !searchQuery.trim() ? true : (
      q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.number.includes(searchQuery) ||
      q.emailId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.message.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesType && matchesSearch;
  });

  const totalQueries = queries.length;
  const totalComplaints = queries.filter(q => q.optionType === 'Complaint').length;
  const totalHelpQueries = queries.filter(q => q.optionType === 'Query').length;
  const totalCareers = queries.filter(q => q.optionType === 'Career').length;

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Complaint':
        return { bg: '#450a0a', border: '#7f1d1d', color: '#f87171', icon: <AlertTriangle className="h-4.5 w-4.5 mr-1.5 flex-shrink-0" /> };
      case 'Career':
        return { bg: '#062f4f', border: '#0a4b7c', color: '#60a5fa', icon: <Briefcase className="h-4.5 w-4.5 mr-1.5 flex-shrink-0" /> };
      default: // Query
        return { bg: '#052e16', border: '#14532d', color: '#4ade80', icon: <HelpCircle className="h-4.5 w-4.5 mr-1.5 flex-shrink-0" /> };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#e4e4e7' }}>
      <style>{`
        .contacts-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .contacts-tr {
          border-bottom: 1px solid #1c1c1e;
          transition: background 0.15s ease;
        }
        .contacts-tr:hover {
          background: #141416;
        }
        .contacts-th {
          color: #71717a;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 14px 18px;
          border-bottom: 1px solid #1c1c1e;
        }
        .contacts-td {
          padding: 16px 18px;
          font-size: 13px;
          vertical-align: middle;
        }
        .stat-card {
          background: #0d0d0f;
          border: 1px solid #1c1c1e;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 160px;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #1c1c1e', paddingBottom: 20 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Contact Queries</h1>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
            Manage complaints, user queries, and career requests submitted via the Contact Us form.
          </p>
        </div>
        <button
          onClick={fetchQueries}
          disabled={loading}
          style={{
            background: '#18181b', border: '1px solid #27272a', color: '#fff',
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics Summary */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="stat-card">
          <div style={{ fontSize: 20 }}>📬</div>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 800 }}>{totalQueries}</div>
          <div style={{ color: '#71717a', fontSize: 12 }}>Total Submissions</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 20 }}>❓</div>
          <div style={{ color: '#4ade80', fontSize: 26, fontWeight: 800 }}>{totalHelpQueries}</div>
          <div style={{ color: '#71717a', fontSize: 12 }}>User Queries</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 20 }}>⚠️</div>
          <div style={{ color: '#f87171', fontSize: 26, fontWeight: 800 }}>{totalComplaints}</div>
          <div style={{ color: '#71717a', fontSize: 12 }}>Complaints</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 20 }}>💼</div>
          <div style={{ color: '#60a5fa', fontSize: 26, fontWeight: 800 }}>{totalCareers}</div>
          <div style={{ color: '#71717a', fontSize: 12 }}>Career Applications</div>
        </div>
      </div>

      {/* Filters and Search controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search style={{ position: 'absolute', left: 12, top: 10, height: 16, width: 16, color: '#71717a' }} />
            <input
              type="text"
              placeholder="Search by name, email, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 10, color: '#fff',
                padding: '9px 14px 9px 38px', fontSize: 13, outline: 'none', width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 10, padding: '0 12px' }}>
            <Filter className="h-4 w-4 text-[#71717a]" />
            <select
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#a1a1aa',
                padding: '9px 0', fontSize: 13, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">All Types</option>
              <option value="Query">Queries Only</option>
              <option value="Complaint">Complaints Only</option>
              <option value="Career">Careers Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16 }}>
          <div style={{ width: 32, height: 32, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#71717a', fontSize: 13 }}>Syncing with databases...</p>
        </div>
      ) : error ? (
        <div style={{ padding: 50, textAlign: 'center', color: '#f87171', background: '#450a0a1a', border: '1px solid #7f1d1d33', borderRadius: 16 }}>
          ⚠️ {error}
        </div>
      ) : filteredQueries.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', color: '#71717a', background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16 }}>
          📭 No contact form submissions found matching your search.
        </div>
      ) : (
        <div style={{ background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="contacts-table">
              <thead>
                <tr style={{ background: '#141416' }}>
                  <th className="contacts-th">User Info</th>
                  <th className="contacts-th">Contact Info</th>
                  <th className="contacts-th">Category</th>
                  <th className="contacts-th">Date</th>
                  <th className="contacts-th" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueries.map((q) => {
                  const style = getTypeStyle(q.optionType);
                  const isExpanded = expandedId === q.id;

                  return (
                    <React.Fragment key={q.id}>
                      <tr className="contacts-tr">
                        {/* User Name */}
                        <td className="contacts-td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #1f1f23, #18181b)', border: '1px solid #27272a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa' }}>
                              <User className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <div style={{ color: '#fff', fontWeight: 600 }}>{q.name}</div>
                              <div style={{ color: '#71717a', fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>ID: {q.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="contacts-td">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e4e4e7' }}>
                              <Mail className="h-3.5 w-3.5 text-zinc-500" />
                              <a href={`mailto:${q.emailId}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover:underline">{q.emailId}</a>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a1a1aa' }}>
                              <Phone className="h-3.5 w-3.5 text-zinc-500" />
                              <a href={`tel:${q.number}`} style={{ color: 'inherit', textDecoration: 'none' }}>{q.number}</a>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="contacts-td">
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700,
                            padding: '3px 10px', borderRadius: 20, background: style.bg,
                            border: `1px solid ${style.border}`, color: style.color, textTransform: 'uppercase'
                          }}>
                            {style.icon}
                            {q.optionType}
                          </span>
                        </td>

                        {/* Creation Date */}
                        <td className="contacts-td" style={{ color: '#a1a1aa' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                            {new Date(q.createdAt).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="contacts-td" style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : q.id)}
                              style={{
                                background: '#18181b', border: '1px solid #27272a', borderRadius: 8,
                                color: '#a1a1aa', padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5" />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                  View Message
                                </>
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleDelete(q.id)}
                              disabled={deleteLoading === q.id}
                              style={{
                                background: '#450a0a22', border: '1px solid #7f1d1d', borderRadius: 8,
                                color: '#f87171', padding: '6px', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                              }}
                              className="hover:bg-red-950/40"
                              title="Delete Submission"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable message box */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} style={{ padding: '0 18px 16px', background: '#09090b44' }}>
                            <div style={{
                              background: '#070709', border: '1px solid #1c1c1e', borderRadius: 12, padding: 16,
                              color: '#a1a1aa', fontSize: 13, lineHeight: 1.6
                            }}>
                              <div style={{ color: '#fff', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: '#71717a' }}>
                                Message Body
                              </div>
                              <p style={{ whiteSpace: 'pre-wrap', color: '#e4e4e7' }}>
                                {q.message || '— No message text provided —'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
