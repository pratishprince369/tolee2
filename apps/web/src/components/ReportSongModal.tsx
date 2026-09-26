'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Flag,
} from 'lucide-react';
import { reportSongAction } from '@/actions/songs';

interface ReportSongModalProps {
  isOpen: boolean;
  song: {
    id: string;
    title: string;
    artist?: { name: string };
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or Promotional Abuse', desc: 'Misleading track, ad repetition, or unauthorized commercial spam' },
  { id: 'copyright', label: 'Copyright / Uncredited Audio', desc: 'Infringing someone else’s copyright or unauthorized cover' },
  { id: 'inappropriate', label: 'Offensive or Inappropriate Audio', desc: 'Hate speech, extreme profanity, or harassment' },
  { id: 'fake_audio', label: 'Fake, Silent, or Distorted Audio', desc: 'Track audio is broken, heavily distorted, or completely wrong' },
  { id: 'other', label: 'Other Guidelines Violation', desc: 'Other community guideline violations' },
];

export function ReportSongModal({ isOpen, song, onClose, onSuccess }: ReportSongModalProps) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !song) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await reportSongAction(song.id, reason, details);
      if (!res.success) {
        throw new Error(res.error || 'Failed to submit report');
      }
      setSuccessMsg(res.message || 'Report submitted to Super Admin for immediate review.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccessMsg(null);
        setDetails('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Report Audio Track</h3>
              <p className="text-xs text-zinc-400 truncate max-w-[220px]">
                "{song.title}" {song.artist?.name ? `• ${song.artist.name}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-2">
              Why are you reporting this song?
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    reason === r.id
                      ? 'bg-rose-500/10 border-rose-500/40 text-white'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="mt-0.5 text-rose-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold block">{r.label}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">{r.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Provide any details to help Super Admin investigate..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-full bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-full transition shadow-lg shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
