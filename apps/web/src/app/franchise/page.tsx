'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, CheckCircle2, ShieldCheck, DollarSign, Users, Award, MapPin, Building, ArrowRight } from 'lucide-react';

export default function FranchiseApplyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaarPan, setAadhaarPan] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdFranchise, setCreatedFranchise] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('Please accept the franchise agreement to proceed.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/franchise/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          businessName,
          mobile,
          email,
          aadhaarPan,
          address,
          state,
          city,
          area,
          pincode,
          preferredLocation,
          paymentDetails
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to submit application.');
        return;
      }

      setSuccess(true);
      setCreatedFranchise(data.franchise);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans pb-16">
      {/* Header Banner */}
      <div className="border-b border-zinc-200/60 dark:border-zinc-900/60 bg-zinc-50/50 dark:bg-zinc-900/10 py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/50 rounded-full text-xs font-semibold text-zinc-650 dark:text-zinc-300">
            <Building className="w-3.5 h-3.5" /> Partners Program
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-850 dark:text-white">
            Become a Tolee Franchise Owner
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Own a referral marketing hub in your location, onboard creators and local businesses, and earn recurring lifetime commissions from ads.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Info Left Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 bg-zinc-50/30 dark:bg-zinc-900/5 space-y-5">
            <h3 className="text-base font-bold text-zinc-850 dark:text-zinc-200 border-b border-zinc-200/50 dark:border-zinc-950 pb-3">
              Why Partner with Tolee?
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0 font-bold border border-zinc-200/50">
                  <DollarSign className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Referral-Based Share</h4>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed mt-0.5">
                    Earn from the ad spend of all users registered through your unique referral link. Unlimited earnings potential.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0 font-bold border border-zinc-200/50">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Zero Location Conflicts</h4>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed mt-0.5">
                    Multiple franchise owners can target the same city (e.g. Dadar) without conflict. Commissions route only to your unique referred network.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0 font-bold border border-zinc-200/50">
                  <Award className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Scalable Commission Slabs</h4>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed mt-0.5">
                    Your ad commission percentages scale automatically as your network grows (from 2.0% up to 5.0% per ad transaction).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 bg-zinc-50/30 dark:bg-zinc-900/5 space-y-4">
            <h3 className="text-base font-bold text-zinc-850 dark:text-zinc-200 border-b border-zinc-200/50 dark:border-zinc-950 pb-3">
              Commission Slab Milestones
            </h3>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-2.5 bg-white dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-900/50 rounded-xl">
                <span className="text-zinc-500">0 - 19,999 Active Users</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">2.0% Comm.</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-white dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-900/50 rounded-xl">
                <span className="text-zinc-500">20k - 49,999 Active Users</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">2.5% Comm.</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-white dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-900/50 rounded-xl">
                <span className="text-zinc-500">50k - 99,999 Active Users</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">3.5% Comm.</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-white dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-900/50 rounded-xl">
                <span className="text-zinc-500">100k+ Active Users</span>
                <span className="font-bold text-zinc-850 dark:text-zinc-100">5.0% Comm.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Right Column */}
        <div className="lg:col-span-7">
          {status === 'loading' ? (
            <div className="text-center py-20 text-zinc-400 animate-pulse font-medium">Verifying Partner Program credentials...</div>
          ) : !session ? (
            <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-8 bg-zinc-50/20 dark:bg-zinc-900/5 text-center space-y-4">
              <Bot className="w-12 h-12 text-zinc-400 mx-auto" />
              <h3 className="text-lg font-black text-zinc-800 dark:text-white">Partner Program Access Locked</h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-sm mx-auto leading-relaxed">
                Please sign in with your Tolee creator account to fill out the franchise application.
              </p>
              <Button onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/franchise')}`)} className="bg-zinc-800 hover:bg-zinc-900 text-white font-bold px-6 py-2.5 rounded-xl text-xs gap-1.5 shadow-sm">
                Sign In to Apply <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : success ? (
            <div className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-8 bg-zinc-50/20 dark:bg-zinc-900/5 text-center space-y-5 animate-in fade-in duration-300">
              <CheckCircle2 className="w-12 h-12 text-zinc-500 mx-auto" />
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-zinc-800 dark:text-white">Application Received!</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-550 max-w-md mx-auto leading-relaxed">
                  Thank you for applying. Your application code is <span className="font-mono font-extrabold text-zinc-800 dark:text-white bg-zinc-150 dark:bg-zinc-900 px-2 py-0.5 rounded">{createdFranchise?.code}</span>. The Super Admin team will review your payment reference and verify details within 24-48 hours.
                </p>
              </div>
              <div className="pt-2">
                <Button onClick={() => router.push('/franchise/dashboard')} className="bg-zinc-800 hover:bg-zinc-900 text-white font-bold px-6 py-2.5 rounded-xl text-xs">
                  Go to Franchise Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#0c0c0e]/80 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-zinc-850 dark:text-white border-b border-zinc-200/50 dark:border-zinc-900/60 pb-3">
                Franchise Registration Application
              </h3>

              {error && <div className="p-3 bg-red-100/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-xs text-red-500 font-semibold">{error}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Full Name</label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="As per Aadhaar/PAN" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Business Name (Optional)</label>
                  <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Firm or Agency Name" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Mobile Number</label>
                  <Input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} required placeholder="10-digit number" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Email ID</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="partner@yourdomain.com" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Aadhaar / PAN Number (Optional)</label>
                  <Input value={aadhaarPan} onChange={e => setAadhaarPan(e.target.value)} placeholder="For KYC Verification" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Preferred Franchise Target Area</label>
                  <Input value={preferredLocation} onChange={e => setPreferredLocation(e.target.value)} required placeholder="e.g. Dadar, Mumbai" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Full Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} required placeholder="Street address, building name, flat number" rows={2} className="w-full bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">Area</label>
                  <Input value={area} onChange={e => setArea(e.target.value)} required placeholder="Dadar East" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">City</label>
                  <Input value={city} onChange={e => setCity(e.target.value)} required placeholder="Mumbai" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">State</label>
                  <Input value={state} onChange={e => setState(e.target.value)} required placeholder="Maharashtra" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500">PIN Code</label>
                  <Input value={pincode} onChange={e => setPincode(e.target.value)} required placeholder="400014" className="bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/80 dark:border-zinc-800 text-xs rounded-xl h-10" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-450 dark:text-zinc-500 block">Registration Fee Payment Reference</label>
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/50 rounded-xl space-y-3">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-450 leading-relaxed font-semibold">
                    To activate your marketing rights in the preferred area, make a payout/deposit of franchise registration fee to Tolee partner account and enter transaction ID.
                  </p>
                  <Input value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)} placeholder="Enter UPI Transaction Reference Number" className="bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-850 text-xs rounded-xl h-10 font-mono" />
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="rounded border-zinc-300 text-zinc-650 w-4 h-4 mt-0.5 focus:ring-0 cursor-pointer" />
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal cursor-pointer">
                  I agree to the Tolee Franchise Terms of Service. I understand that revenue sharing commissions are calculated based on my unique referral link network conversions, and location selection is used for marketing rights only.
                </label>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-zinc-800 hover:bg-zinc-900 text-white font-bold h-11 rounded-xl shadow-sm text-xs gap-1.5">
                {loading ? 'Submitting Registration...' : 'Submit Application Form'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
