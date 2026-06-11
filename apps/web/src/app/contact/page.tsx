'use client';

import React, { useState } from 'react';
import { submitContactQuery } from '@/actions/contact';
import { MessageSquare, Phone, Mail, FileText, CheckCircle, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    emailId: '',
    optionType: 'Query',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Simple client-side validation
    if (!formData.name.trim()) {
      setError('Name is required.');
      setLoading(false);
      return;
    }
    if (!formData.number.trim()) {
      setError('Phone number is required.');
      setLoading(false);
      return;
    }
    if (!formData.emailId.trim()) {
      setError('Email ID is required.');
      setLoading(false);
      return;
    }

    try {
      const result = await submitContactQuery({
        name: formData.name,
        number: formData.number,
        emailId: formData.emailId,
        optionType: formData.optionType,
        message: formData.message,
      });

      if (result.success) {
        setSuccess(true);
        setFormData({
          name: '',
          number: '',
          emailId: '',
          optionType: 'Query',
          message: '',
        });
      } else {
        setError(result.error || 'Failed to submit form.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="max-w-md w-full space-y-8 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/40 p-8 rounded-3xl shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex p-3.5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/5 dark:to-emerald-500/5 rounded-2xl border border-green-500/20 dark:border-green-500/10 mb-4 animate-pulse">
            <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">
            Contact Us
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Please fill out the form below to get in touch with our team.
          </p>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 p-4 rounded-2xl flex items-start gap-3 text-emerald-800 dark:text-emerald-300 animate-fadeIn">
            <CheckCircle className="h-5 w-5 mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Thank You!</p>
              <p className="text-xs mt-0.5 opacity-90">Your message has been received successfully. Our super admin will review it soon.</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 p-4 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 animate-fadeIn">
            <AlertCircle className="h-5 w-5 mt-0.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Submission Error</p>
              <p className="text-xs mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 ml-1">
              Full Name
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                <FileText className="h-5 w-5" />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm placeholder-zinc-400 dark:placeholder-zinc-600 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                placeholder="Enter your name"
              />
            </div>
          </div>

          {/* Number Field */}
          <div>
            <label htmlFor="number" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 ml-1">
              Phone Number
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                <Phone className="h-5 w-5" />
              </div>
              <input
                id="number"
                name="number"
                type="tel"
                required
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="block w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm placeholder-zinc-400 dark:placeholder-zinc-600 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 ml-1">
              Email Address
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.emailId}
                onChange={(e) => setFormData({ ...formData, emailId: e.target.value })}
                className="block w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm placeholder-zinc-400 dark:placeholder-zinc-600 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                placeholder="Enter your email address"
              />
            </div>
          </div>

          {/* Query Type Select */}
          <div>
            <label htmlFor="optionType" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 ml-1">
              Query Type
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <select
                id="optionType"
                name="optionType"
                value={formData.optionType}
                onChange={(e) => setFormData({ ...formData, optionType: e.target.value })}
                className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all appearance-none cursor-pointer"
              >
                <option value="Query">Query</option>
                <option value="Complaint">Complaint</option>
                <option value="Career">Career</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500 dark:text-zinc-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Details / Message */}
          <div>
            <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 ml-1">
              Message / Details (Optional)
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute top-3 left-4 text-zinc-400 dark:text-zinc-500">
                <MessageSquare className="h-5 w-5" />
              </div>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="block w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm placeholder-zinc-400 dark:placeholder-zinc-600 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
                placeholder="Write your message here..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
