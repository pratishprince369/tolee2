"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Phone, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  getOnboardingStatus,
  updateUserLocation,
  updateUserPhoneDirectly,
} from '@/actions/user';

const PREDEFINED_LOCATIONS = ['Mumbai', 'Delhi', 'Kalyan', 'Ghatkopar', 'Pune'];

export function OnboardingModal() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'location' | 'phone' | 'success'>('location');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Location State
  const [location, setLocation] = useState('');
  const [subLocation, setSubLocation] = useState('');

  // Step 2: Mobile Number State
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Check if onboarding is required - DISABLED in onboarding redesign (users explore first)
  useEffect(() => {
    /* 
    if (status !== 'authenticated' || !session?.user) return;

    const checkStatus = async () => {
      const res = await getOnboardingStatus();
      if (res.success && res.onboardingRequired) {
        // Wait 1.5 seconds before popping up as required
        setTimeout(() => {
          setIsOpen(true);
          // Set initial step based on what's missing
          if (!res.location) {
            setStep('location');
          } else if (!res.phone) {
            setStep('phone');
          }
        }, 1500);
      }
    };

    checkStatus();
    */
  }, [session, status]);

  // Handle step 1: Location submit
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      setErrorMsg('Location is required.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await updateUserLocation(location, subLocation);
      if (res.success) {
        setIsLoading(false);
        // Transition smooth fade delay
        setTimeout(() => {
          setStep('phone');
        }, 800);
      } else {
        setErrorMsg(res.error || 'Failed to update location. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle step 2: Phone number submit (directly save without OTP verification)
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = `${countryCode}${phoneNumber.trim()}`;
    if (!phoneNumber.trim()) {
      setErrorMsg('Mobile number is required.');
      return;
    }
    if (!/^\d{10}$/.test(phoneNumber.trim())) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await updateUserPhoneDirectly(fullPhone);
      if (res.success) {
        setStep('success');
        // Let user see success animation for 2 seconds, then refresh session and close
        setTimeout(() => {
          setIsOpen(false);
          router.refresh();
        }, 2000);
      } else {
        setErrorMsg(res.error || 'This mobile number is already linked to another account.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Do not render anything if not open
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        showCloseButton={false} 
        className="w-full max-w-md bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-2xl overflow-hidden p-6 gap-0 animate-in fade-in zoom-in-95 duration-200"
      >
        <DialogHeader className="mb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            {step === 'location' && <MapPin className="w-6 h-6 animate-bounce" />}
            {step === 'phone' && <Phone className="w-6 h-6 animate-pulse" />}
            {step === 'success' && <CheckCircle2 className="w-6 h-6 text-green-500 scale-110 duration-300" />}
          </div>
          <DialogTitle className="text-xl font-bold text-center text-gray-900 dark:text-gray-50">
            {step === 'location' && 'Update Your Location'}
            {step === 'phone' && 'Update Your Mobile Number'}
            {step === 'success' && 'Welcome to Tolee! 🎉'}
          </DialogTitle>
          <DialogDescription className="text-sm text-center text-gray-500 dark:text-gray-400 mt-1">
            {step === 'location' && 'Add your location to receive local notifications, nearby updates and Tolee suggestions.'}
            {step === 'phone' && 'To prevent duplicate accounts and secure your profile, please link a unique mobile number.'}
            {step === 'success' && 'Your profile has been successfully verified and set up.'}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 text-center animate-shake">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: LOCATION FORM */}
        {step === 'location' && (
          <form onSubmit={handleLocationSubmit} className="space-y-4 animate-in slide-in-from-right duration-200">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Primary Location (City)</label>
              <Input
                type="text"
                placeholder="e.g. Mumbai, Delhi, Pune"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full h-11 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-primary rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Sub-Location / Area (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. Kalyan, Ghatkopar"
                value={subLocation}
                onChange={(e) => setSubLocation(e.target.value)}
                className="w-full h-11 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-primary rounded-xl"
              />
            </div>

            {/* Quick Select Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Or Select Nearby City</label>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      if (['Kalyan', 'Ghatkopar'].includes(loc)) {
                        setSubLocation(loc);
                        setLocation('Mumbai');
                      } else {
                        setLocation(loc);
                        setSubLocation('');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                      location === loc || subLocation === loc
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                        : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all duration-200 mt-6"
            >
              {isLoading ? 'Saving Location...' : 'Save & Continue'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        )}

        {/* STEP 2: PHONE FORM */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4 animate-in slide-in-from-right duration-200">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Mobile Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').substring(0, 10))}
                  required
                  className="flex-grow h-11 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-primary rounded-xl font-medium tracking-wide"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all duration-200 mt-6"
            >
              {isLoading ? 'Saving Number...' : 'Submit'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="py-6 flex flex-col items-center justify-center animate-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
              <CheckCircle2 className="w-16 h-16 text-green-500 relative" />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-4 text-center">
              Onboarding Completed Successfully!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              Redirecting you to the platform...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
