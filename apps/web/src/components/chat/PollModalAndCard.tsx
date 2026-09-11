'use client';

import React, { useState } from 'react';
import { BarChart2, Plus, Trash2, X, Check, Circle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PollOptionData {
  id: string;
  text: string;
  votes: string[]; // array of userIds who voted
}

export interface PollData {
  id: string;
  question: string;
  options: PollOptionData[];
  allowMultiple?: boolean;
  creatorId?: string;
  creatorName?: string;
}

interface PollCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (poll: { question: string; options: string[]; allowMultiple: boolean }) => void;
}

export function PollCreationModal({ isOpen, onClose, onCreatePoll }: PollCreationModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions(prev => [...prev, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    setOptions(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      alert("Please enter a poll question.");
      return;
    }

    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      alert("Please provide at least 2 non-empty options.");
      return;
    }

    onCreatePoll({
      question: question.trim(),
      options: validOptions,
      allowMultiple
    });

    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-zinc-900 dark:text-white">Create Poll</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Poll Question *
            </label>
            <Input
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Options ({options.length}/10)</span>
            </label>

            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs flex-1"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"
                    title="Remove option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddOption}
                className="w-full text-xs rounded-xl border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 mt-1"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
              </Button>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Allow multiple answers
              </p>
              <p className="text-[11px] text-zinc-400">
                Voters can select more than one option
              </p>
            </div>
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold px-6 shadow-md"
            >
              Send Poll
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PollCardProps {
  pollData: PollData;
  currentUserId?: string;
  isMe?: boolean;
  onVote?: (optionIndex: number) => void;
}

export function PollCard({ pollData, currentUserId, isMe, onVote }: PollCardProps) {
  const allVotersSet = new Set<string>();
  pollData.options.forEach(opt => {
    (opt.votes || []).forEach(uid => allVotersSet.add(uid));
  });
  const totalVotesCount = allVotersSet.size;

  return (
    <div className={`p-3.5 rounded-2xl border shadow-sm my-1.5 w-full max-w-[340px] select-none ${
      isMe 
        ? 'bg-black/20 border-white/20 text-white' 
        : 'bg-zinc-50 dark:bg-zinc-800/90 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100'
    }`}>
      {/* Poll Header */}
      <div className="flex items-start gap-2 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isMe ? 'bg-white/20 text-white' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
        }`}>
          <BarChart2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-snug">
            {pollData.question}
          </p>
          <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
            isMe ? 'text-white/70' : 'text-zinc-400 dark:text-zinc-500'
          }`}>
            {pollData.allowMultiple ? 'Select one or more' : 'Select one'}
          </p>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {pollData.options.map((opt, idx) => {
          const voteCount = opt.votes ? opt.votes.length : 0;
          const percentage = totalVotesCount > 0 ? Math.round((voteCount / totalVotesCount) * 100) : 0;
          const isUserVoted = currentUserId ? (opt.votes || []).includes(currentUserId) : false;

          return (
            <button
              key={opt.id || idx}
              type="button"
              onClick={() => onVote?.(idx)}
              className={`group relative w-full text-left p-2.5 rounded-xl border transition-all overflow-hidden flex flex-col justify-center active:scale-[0.99] ${
                isUserVoted
                  ? isMe
                    ? 'border-white bg-white/20'
                    : 'border-primary bg-primary/10 dark:bg-primary/20'
                  : isMe
                    ? 'border-white/20 hover:border-white/40 bg-black/10'
                    : 'border-zinc-200/80 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
              }`}
            >
              {/* Animated progress bar fill */}
              {totalVotesCount > 0 && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 opacity-20 pointer-events-none ${
                    isMe ? 'bg-white' : 'bg-primary'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                    isUserVoted
                      ? isMe
                        ? 'border-white bg-white text-teal-900'
                        : 'border-primary bg-primary text-white'
                      : isMe
                        ? 'border-white/40'
                        : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {isUserVoted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className={`text-xs font-semibold truncate ${
                    isUserVoted ? 'font-bold' : ''
                  }`}>
                    {opt.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono font-bold">
                  {totalVotesCount > 0 && (
                    <span className={isMe ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}>
                      {percentage}%
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isMe ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                  }`}>
                    {voteCount}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Details */}
      <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-medium ${
        isMe ? 'border-white/10 text-white/70' : 'border-black/10 dark:border-white/10 text-zinc-400'
      }`}>
        <span>{totalVotesCount} {totalVotesCount === 1 ? 'vote' : 'votes'} total</span>
        <span>Tap an option to vote</span>
      </div>
    </div>
  );
}
