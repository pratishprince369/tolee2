'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Send, AlertTriangle, Building, 
  ChevronRight, CheckCircle2, ShieldCheck, Trash2, Edit3, MessageSquare, Briefcase, PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUserOwnedTolees } from '@/actions/tolee';
import { getAIMemories, saveAIMemory, deleteAIMemory } from '@/actions/ai-manager';

const BUSINESS_TYPES = [
  'Real Estate',
  'Digital Marketing',
  'Education',
  'Hospital',
  'Restaurant',
  'Retail',
  'Insurance',
  'Finance',
  'Automobile',
  'Other'
];

interface Lead {
  id: string;
  name: string;
  phone: string;
  stage: 'New' | 'Discussion' | 'Proposal' | 'Closed Won' | 'Closed Lost';
  value: string;
}

interface CRMData {
  id: string;
  toleeId: string;
  toleeName: string;
  crmName: string;
  businessType: string;
  leads: Lead[];
}

export function AICRM() {
  const router = useRouter();
  const [tolees, setTolees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToleeId, setSelectedToleeId] = useState<string>('');
  const [crms, setCRMs] = useState<CRMData[]>([]);

  // Wizard State
  const [isCreatingCRM, setIsCreatingCRM] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [newCRMName, setNewCRMName] = useState('');
  const [newBusinessType, setNewBusinessType] = useState('Real Estate');

  // New Lead State
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadStage, setLeadStage] = useState<'New' | 'Discussion' | 'Proposal' | 'Closed Won' | 'Closed Lost'>('New');
  const [leadValue, setLeadValue] = useState('');

  useEffect(() => {
    loadUserToleesAndCRMs();
  }, []);

  const loadUserToleesAndCRMs = async () => {
    setLoading(true);
    const [toleeRes, memoryRes] = await Promise.all([
      getUserOwnedTolees(),
      getAIMemories('crm')
    ]);

    let userToleesList: any[] = [];
    if (toleeRes.success && toleeRes.tolees) {
      userToleesList = toleeRes.tolees;
      setTolees(userToleesList);
      if (userToleesList.length > 0 && !selectedToleeId) {
        setSelectedToleeId(userToleesList[0].id);
      }
    }

    if (memoryRes.success && memoryRes.memories) {
      const loadedCRMs: CRMData[] = memoryRes.memories.map((m: any) => {
        try {
          const parsed = JSON.parse(m.value);
          return {
            id: m.id,
            toleeId: parsed.toleeId || m.key,
            toleeName: parsed.toleeName || 'My Tolee',
            crmName: parsed.crmName || 'CRM Manager',
            businessType: parsed.businessType || 'General',
            leads: parsed.leads || []
          };
        } catch {
          return {
            id: m.id,
            toleeId: m.key,
            toleeName: 'My Tolee',
            crmName: 'CRM Manager',
            businessType: 'General',
            leads: []
          };
        }
      });
      setCRMs(loadedCRMs);
    }
    setLoading(false);
  };

  const currentTolee = tolees.find(t => t.id === selectedToleeId) || tolees[0];
  const activeCRM = crms.find(c => c.toleeId === selectedToleeId);

  // Wizard Step 4 Save Handler
  const handleSaveCRM = async () => {
    if (!selectedToleeId || !newCRMName.trim()) return;

    const targetTolee = tolees.find(t => t.id === selectedToleeId);
    const payload = JSON.stringify({
      toleeId: selectedToleeId,
      toleeName: targetTolee?.name || 'Tolee Community',
      crmName: newCRMName.trim(),
      businessType: newBusinessType,
      leads: [
        { id: '1', name: 'Rahul Sharma', phone: '+91 98765 43210', stage: 'Discussion', value: '₹50,000' },
        { id: '2', name: 'Amit Kumar', phone: '+91 98123 45678', stage: 'Proposal', value: '₹75,000' }
      ]
    });

    await saveAIMemory({
      category: 'crm',
      key: `crm_${selectedToleeId}`,
      value: payload
    });

    setIsCreatingCRM(false);
    setWizardStep(1);
    setNewCRMName('');
    loadUserToleesAndCRMs();
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCRM || !leadName.trim()) return;

    const updatedLeads = [
      ...activeCRM.leads,
      {
        id: `lead_${Date.now()}`,
        name: leadName.trim(),
        phone: leadPhone.trim() || 'N/A',
        stage: leadStage,
        value: leadValue.trim() ? `₹${leadValue.trim().replace(/^₹/, '')}` : '₹0'
      }
    ];

    const payload = JSON.stringify({
      toleeId: activeCRM.toleeId,
      toleeName: activeCRM.toleeName,
      crmName: activeCRM.crmName,
      businessType: activeCRM.businessType,
      leads: updatedLeads
    });

    await saveAIMemory({
      category: 'crm',
      key: `crm_${activeCRM.toleeId}`,
      value: payload
    });

    setLeadName('');
    setLeadPhone('');
    setLeadValue('');
    setShowAddLead(false);
    loadUserToleesAndCRMs();
  };

  const handleDeleteCRM = async () => {
    if (!activeCRM) return;
    if (!confirm(`Are you sure you want to delete CRM "${activeCRM.crmName}"?`)) return;
    await deleteAIMemory(activeCRM.id);
    loadUserToleesAndCRMs();
  };

  const handleSendWhatsAppDraft = (leadName: string, phone: string) => {
    const text = `Hi ${leadName}, following up regarding our recent proposal for ${currentTolee?.name || 'our group'}. Please let us know if you have any questions!`;
    const targetPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const url = targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // ------------------------------------
  // SCENARIO 1: NO TOLEE CREATED YET
  // ------------------------------------
  if (!loading && tolees.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-md text-center space-y-6">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-3xl w-fit mx-auto">
            <Building className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
              📋 CRM Setup Required
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
              Before creating a CRM, you need to create your first Tolee (Community).
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed">
              A CRM always belongs to a Tolee and helps you manage leads, customers, and business activities for that community.
            </p>
          </div>

          <Button 
            onClick={() => router.push('/create-tolee')}
            className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold px-8 py-3 text-sm shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Create New Tolee
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------
  // SCENARIO 2: TOLEE EXISTS BUT NO CRM (OR WIZARD LAUNCHED)
  // ------------------------------------
  if (isCreatingCRM || (!loading && !activeCRM)) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
            <span className="text-xs font-extrabold uppercase text-indigo-600 tracking-wider">Step {wizardStep} of 4</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {wizardStep === 1 && 'Step 1: Select Tolee'}
              {wizardStep === 2 && 'Step 2: Enter CRM Name'}
              {wizardStep === 3 && 'Step 3: Choose Business Type'}
              {wizardStep === 4 && 'Step 4: Confirm & Launch CRM'}
            </h2>
            <p className="text-xs text-slate-500">Connect a dedicated lead management CRM engine to your group.</p>
          </div>

          {/* STEP 1: SELECT TOLEE */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Which Tolee (Group) should this CRM belong to?
              </label>
              <select
                value={selectedToleeId}
                onChange={(e) => setSelectedToleeId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl p-3.5 text-sm font-semibold text-slate-900 dark:text-white"
              >
                {tolees.map((t) => (
                  <option key={t.id} value={t.id}>
                    🏢 {t.name} ({t._count?.members || 0} Members)
                  </option>
                ))}
              </select>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setWizardStep(2)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold px-6">
                  Next Step <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: CRM NAME */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Give your CRM a name:
              </label>
              <Input
                value={newCRMName}
                onChange={(e) => setNewCRMName(e.target.value)}
                placeholder="e.g. Mumbai Real Estate Leads CRM"
                className="rounded-2xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-sm p-3.5"
              />
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setWizardStep(1)}>Back</Button>
                <Button 
                  disabled={!newCRMName.trim()} 
                  onClick={() => setWizardStep(3)} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold px-6"
                >
                  Next Step <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: BUSINESS TYPE */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Select Business Category:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {BUSINESS_TYPES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setNewBusinessType(b)}
                    className={`p-3 text-left rounded-2xl border text-xs font-bold transition-all ${
                      newBusinessType === b 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    💼 {b}
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setWizardStep(2)}>Back</Button>
                <Button onClick={() => setWizardStep(4)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold px-6">
                  Next Step <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRM & CREATE */}
          {wizardStep === 4 && (
            <div className="space-y-6 text-center py-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-3xl w-fit mx-auto">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Ready to create "{newCRMName}"?</h3>
                <p className="text-xs text-slate-500">
                  Linked to <span className="font-bold text-indigo-600">{currentTolee?.name || 'Tolee'}</span> • Business: <span className="font-bold">{newBusinessType}</span>
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={() => setWizardStep(3)}>Back</Button>
                <Button onClick={handleSaveCRM} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold px-8">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Launch CRM
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------
  // SCENARIO 3: ACTIVE CRM DASHBOARD
  // ------------------------------------
  if (!activeCRM) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header with Tolee Switcher */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{activeCRM.crmName}</h2>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                  {activeCRM.businessType}
                </span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Founder
                </span>
              </div>
              <p className="text-xs text-slate-500">Managing leads and customer follow-ups for {activeCRM.toleeName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tolee Selector Dropdown */}
            {tolees.length > 1 && (
              <select
                value={selectedToleeId}
                onChange={(e) => setSelectedToleeId(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
              >
                {tolees.map((t) => (
                  <option key={t.id} value={t.id}>
                    🏢 {t.name}
                  </option>
                ))}
              </select>
            )}

            <Button 
              size="sm" 
              onClick={() => setShowAddLead(true)} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Lead
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleDeleteCRM}
              className="text-rose-500 hover:bg-rose-50 rounded-full text-xs"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Lead Pipeline Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Leads</span>
            <p className="text-xl font-black text-slate-900 dark:text-white">{activeCRM.leads.length}</p>
          </div>
          <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl">
            <span className="text-[10px] font-bold text-indigo-600 uppercase">In Discussion</span>
            <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
              {activeCRM.leads.filter(l => l.stage === 'Discussion').length}
            </p>
          </div>
          <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl">
            <span className="text-[10px] font-bold text-purple-600 uppercase">Proposal Sent</span>
            <p className="text-xl font-black text-purple-700 dark:text-purple-300">
              {activeCRM.leads.filter(l => l.stage === 'Proposal').length}
            </p>
          </div>
          <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Closed Won</span>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              {activeCRM.leads.filter(l => l.stage === 'Closed Won').length}
            </p>
          </div>
        </div>
      </div>

      {/* Add Lead Modal Form */}
      {showAddLead && (
        <form onSubmit={handleAddLead} className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-3xl p-6 space-y-4 shadow-md">
          <h3 className="font-bold text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Add New Lead
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input 
              value={leadName} 
              onChange={e => setLeadName(e.target.value)} 
              placeholder="Lead Name (e.g. Rahul Sharma)" 
              required
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              value={leadPhone} 
              onChange={e => setLeadPhone(e.target.value)} 
              placeholder="Phone Number (for WhatsApp follow-up)" 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              value={leadValue} 
              onChange={e => setLeadValue(e.target.value)} 
              placeholder="Deal Value (e.g. ₹50,000)" 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <select
              value={leadStage}
              onChange={(e: any) => setLeadStage(e.target.value)}
              className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="New">New Lead</option>
              <option value="Discussion">In Discussion</option>
              <option value="Proposal">Proposal Sent</option>
              <option value="Closed Won">Closed Won 🎉</option>
              <option value="Closed Lost">Closed Lost</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddLead(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-indigo-600 text-white rounded-xl">Save Lead</Button>
          </div>
        </form>
      )}

      {/* Leads Table / List */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-600" /> Active Leads Pipeline ({activeCRM.leads.length})
        </h3>

        <div className="space-y-3">
          {activeCRM.leads.length > 0 ? (
            activeCRM.leads.map((lead) => (
              <div 
                key={lead.id} 
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl flex-wrap gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{lead.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {lead.stage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-3">
                    <span>📞 {lead.phone}</span>
                    <span>•</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{lead.value}</span>
                  </p>
                </div>

                <Button 
                  size="sm" 
                  onClick={() => handleSendWhatsAppDraft(lead.name, lead.phone)}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> WhatsApp Follow-up
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-6">No leads added to this CRM yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
