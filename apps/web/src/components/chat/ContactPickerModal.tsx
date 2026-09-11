'use client';

import React, { useState } from 'react';
import { User, Phone, Search, X, Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface ContactInfo {
  name: string;
  phone?: string;
  userId?: string;
  avatar?: string;
}

interface ContactPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: ContactInfo) => void;
  availableContacts?: ContactInfo[];
}

export function ContactPickerModal({
  isOpen,
  onClose,
  onSelectContact,
  availableContacts = []
}: ContactPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'manual'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');

  if (!isOpen) return null;

  const filteredContacts = availableContacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      alert('Please enter contact name');
      return;
    }
    onSelectContact({
      name: customName.trim(),
      phone: customPhone.trim() || undefined
    });
    setCustomName('');
    setCustomPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-zinc-900 dark:text-white">Share Contact</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 flex border-b border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'list'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Recent / Contacts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Enter Details
          </button>
        </div>

        {/* Content */}
        {activeTab === 'list' ? (
          <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-[220px]">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact, idx) => (
                  <button
                    key={contact.userId || idx}
                    type="button"
                    onClick={() => {
                      onSelectContact(contact);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left group"
                  >
                    <Avatar className="w-10 h-10 border border-zinc-200/60 dark:border-zinc-700">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback className="text-xs bg-amber-500/10 text-amber-600 font-bold">
                        {contact.name[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary">
                        {contact.name}
                      </p>
                      {contact.phone && (
                        <p className="text-xs text-zinc-400 truncate font-mono">
                          {contact.phone}
                        </p>
                      )}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Check className="w-4 h-4" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-400 space-y-2">
                  <User className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs">No contacts found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('manual')}
                    className="text-xs rounded-xl"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Enter Manual Contact
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Contact Name *
              </label>
              <Input
                placeholder="e.g. Rahul Sharma"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="e.g. +91 98765 43210"
                  type="tel"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="pl-9 bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
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
                className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold px-5"
              >
                Share Contact
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
