'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { uploadFile } from '@/lib/upload';
import { ArrowLeft, MessageSquare, UploadCloud, X, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FeedbackPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // Screenshot states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form submission states
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Prefill email when session changes
  useEffect(() => {
    if (session?.user?.email) {
      setContactEmail(session.user.email);
    }
  }, [session]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handleUpload(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        handleUpload(file);
      } else {
        setError('Please drop an image file (PNG/JPG).');
      }
    }
  };

  // Upload file to Cloudinary
  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const response = await uploadFile(file, (percent) => {
        setUploadProgress(percent);
      });

      if (response && response.secure_url) {
        setScreenshotUrl(response.secure_url);
      } else {
        throw new Error('No URL returned from upload service');
      }
    } catch (err: any) {
      console.error('Screenshot upload failed:', err);
      setError('Failed to upload screenshot. Please try again.');
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  // Remove uploaded screenshot
  const handleRemoveScreenshot = () => {
    setSelectedFile(null);
    setScreenshotUrl('');
    setUploadProgress(0);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe your issue or feedback.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          screenshotUrl,
          contactEmail,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setDescription('');
        setSelectedFile(null);
        setScreenshotUrl('');
      } else {
        setError(data.error || 'Failed to submit feedback. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('A network error occurred. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="max-w-xl w-full space-y-6 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 sm:p-8 rounded-3xl shadow-2xl transition-all duration-300">
        
        {/* Back and Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-[#5c6e80] hover:text-[#0a7c85] dark:text-zinc-400 dark:hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Go Back</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/10 rounded-full">
            <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Super Admin Active</span>
          </div>
        </div>

        {/* Success View */}
        {success ? (
          <div className="py-8 text-center space-y-6 animate-fadeIn">
            <div className="inline-flex p-4 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full border border-emerald-500/20 dark:border-emerald-500/10">
              <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">
                Feedback Sent Successfully!
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Thank you for reporting this issue. A detailed email has been sent directly to the super admin at <span className="font-semibold text-gray-900 dark:text-zinc-200">pratishtolee@gmail.com</span>.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="rounded-2xl px-6 py-2.5 text-sm"
                onClick={() => setSuccess(false)}
              >
                Send Another Feedback
              </Button>
              <Button
                className="bg-[#0a7c85] hover:bg-[#08636a] text-white rounded-2xl px-6 py-2.5 text-sm"
                onClick={() => router.push('/feed')}
              >
                Go to Feed
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header Text */}
            <div className="text-center">
              <div className="inline-flex p-3 bg-gradient-to-br from-[#0a7c85]/10 to-teal-500/10 rounded-2xl border border-[#0a7c85]/20 mb-3">
                <MessageSquare className="h-6 w-6 text-[#0a7c85]" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">
                Feedback & Bug Report
              </h2>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                App me koi bhi problem ho ya error ho, use niche detail me screenshot ke sath likhein.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 p-4 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 animate-fadeIn">
                <AlertCircle className="h-5 w-5 mt-0.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Issue occurred</p>
                  <p className="text-xs mt-0.5 opacity-90">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email Address */}
              <div>
                <label htmlFor="contactEmail" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 ml-1">
                  Contact Email (Optional)
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm placeholder-zinc-400 dark:placeholder-zinc-650 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0a7c85]/20 focus:border-[#0a7c85] transition-all"
                  placeholder="Enter contact email address"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 ml-1">
                  Describe the Problem / Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm placeholder-zinc-400 dark:placeholder-zinc-650 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0a7c85]/20 focus:border-[#0a7c85] transition-all resize-none"
                  placeholder="App me kya problem ho rahi hai, details yaha likhein..."
                />
              </div>

              {/* Screenshot Upload Dropzone */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 ml-1">
                  Upload Screenshot (Recommended)
                </span>
                
                {!screenshotUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                      uploading
                        ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/20 pointer-events-none'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-[#0a7c85] bg-zinc-50/30 dark:bg-zinc-950/10 hover:bg-[#0a7c85]/5 dark:hover:bg-[#0a7c85]/5'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 text-[#0a7c85] animate-spin" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Uploading screenshot...</p>
                          <div className="w-48 bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#0a7c85] h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">{uploadProgress}% uploaded</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 text-zinc-450 dark:text-zinc-505">
                          <UploadCloud className="h-6 w-6" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-gray-750 dark:text-zinc-300">Click or drag screenshot here</p>
                          <p className="text-xs text-zinc-450 dark:text-zinc-505">Supports PNG, JPG, or JPEG formats</p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/20 group">
                    <img
                      src={screenshotUrl}
                      alt="Uploaded Screenshot"
                      className="w-full max-h-56 object-contain bg-zinc-100 dark:bg-zinc-900"
                    />
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="p-1.5 bg-black/75 hover:bg-black/90 text-white rounded-full transition-colors backdrop-blur-sm shadow-md"
                        title="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    
                    <div className="px-3 py-2 bg-white/90 dark:bg-zinc-950/90 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-xs">
                      <span className="text-[#0a7c85] font-semibold truncate max-w-[80%]">Uploaded Successfully</span>
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="text-red-500 hover:text-red-650 font-bold"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting || uploading}
                className="w-full bg-[#0a7c85] hover:bg-[#08636a] text-white rounded-2xl py-3 h-12 text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-205 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting feedback...</span>
                  </>
                ) : (
                  <span>Submit Feedback</span>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
