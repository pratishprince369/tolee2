'use client';

import React, { createContext, useContext, useState, useRef } from 'react';
import { uploadFile } from '@/lib/upload';
import { createPost } from '@/actions/post';

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  file?: File;
}

export interface UploadTask {
  mediaItems: MediaItem[];
  filesCount: number;
  currentFileIndex: number;
  currentProgress: number; // 0-100 for current file
  totalProgress: number;   // 0-100 overall
  state: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  uploadType: 'feed' | 'reel';
  successMessage?: string;
  errorMessage?: string;
  postData?: any;
  stepMessage?: string;
  processingProgress?: number;
}

interface UploadContextType {
  task: UploadTask;
  startUpload: (
    mediaItems: MediaItem[],
    postData: {
      content: string;
      postType: string;
      selectedToleeIds: string[];
      toleeName?: string;
      toleeSlug?: string;
      location?: string | null;
      subLocation?: string | null;
      isAnonymous?: boolean;
    },
    uploadType: 'feed' | 'reel',
    onSuccessCallback?: (createdPost: any, postData: any) => void
  ) => void;
  retryUpload: () => void;
  cancelUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [task, setTask] = useState<UploadTask>({
    mediaItems: [],
    filesCount: 0,
    currentFileIndex: 0,
    currentProgress: 0,
    totalProgress: 0,
    state: 'idle',
    uploadType: 'feed',
  });

  // Keep references to retry parameters
  const retryParamsRef = useRef<{
    mediaItems: MediaItem[];
    postData: any;
    uploadType: 'feed' | 'reel';
    onSuccessCallback?: any;
  } | null>(null);

  const executeUpload = async (
    mediaItems: MediaItem[],
    postData: any,
    uploadType: 'feed' | 'reel',
    onSuccessCallback?: any
  ) => {
    // Save params for retry
    retryParamsRef.current = { mediaItems, postData, uploadType, onSuccessCallback };

    const filesToUpload = mediaItems.filter(item => !!item.file);
    const filesCount = filesToUpload.length;

    setTask({
      mediaItems,
      filesCount,
      currentFileIndex: 0,
      currentProgress: 0,
      totalProgress: 0,
      state: filesCount > 0 ? 'uploading' : 'processing',
      uploadType,
      postData,
    });

    try {
      const uploadedItems: { type: 'image' | 'video'; url: string }[] = [];
      let activeFileIdx = 0;

      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        
        if (item.file) {
          // Update current file index being uploaded
          setTask(prev => ({
            ...prev,
            currentFileIndex: activeFileIdx,
            currentProgress: 0,
            state: 'uploading',
          }));

          const fileIdx = activeFileIdx; // Capture value for callback closure
          const uploadResult = await uploadFile(item.file, (percent) => {
            setTask(prev => {
              const currentProgress = percent;
              // Calculate overall progress across files that need upload
              const totalProgress = Math.round(((fileIdx * 100) + percent) / filesCount);
              
              return {
                ...prev,
                currentProgress,
                totalProgress: Math.min(99, totalProgress), // cap uploading progress at 99% until processing completes
              };
            });
          });

          uploadedItems.push({ type: item.type, url: uploadResult.secure_url });
          activeFileIdx++;
        } else {
          // Already direct URL (like AI generated)
          uploadedItems.push({ type: item.type, url: item.url });
        }
      }

      // Check if any blob URLs slipped through
      if (uploadedItems.some(item => item.url.startsWith('blob:'))) {
        throw new Error('Internal Error: Temporary image URL detected. Upload failed.');
      }

      // Update to Processing State with Live Background Logs
      const isMedia = uploadedItems.length > 0 || uploadType === 'reel';
      const isNews = postData?.postType === 'news';

      const processingSteps = isNews
        ? [
            { msg: 'Step 1/5: ⚡ Analyzing content & extracting key themes...', progress: 25 },
            { msg: 'Step 2/5: ✍️ AI generating SEO title, headline & slug...', progress: 45 },
            { msg: 'Step 3/5: 🏷️ Extracting relevant tags & keywords...', progress: 65 },
            { msg: 'Step 4/5: 📝 Generating meta description & summarizing...', progress: 85 },
            { msg: 'Step 5/5: ✨ Formatting news article & finalizing...', progress: 98 },
          ]
        : isMedia
        ? [
            { msg: 'Step 1/5: 🖼️ Validating media files & checking resolution...', progress: 25 },
            { msg: 'Step 2/5: 🎞️ Optimizing image/video compression & CDN cache...', progress: 45 },
            { msg: 'Step 3/5: 🛡️ Running AI content safety & moderation scan...', progress: 65 },
            { msg: 'Step 4/5: 📍 Tagging location & mapping to selected Tolees...', progress: 85 },
            { msg: 'Step 5/5: 🚀 Distributing post to feed & finalizing...', progress: 98 },
          ]
        : [
            { msg: 'Step 1/4: ⚡ Analyzing post text & hashtags...', progress: 30 },
            { msg: 'Step 2/4: 🛡️ Running moderation & safety checks...', progress: 60 },
            { msg: 'Step 3/4: 🌐 Mapping to selected Tolee groups...', progress: 85 },
            { msg: 'Step 4/4: 🚀 Publishing post to feed...', progress: 98 },
          ];

      let currentStepIdx = 0;
      setTask(prev => ({
        ...prev,
        state: 'processing',
        totalProgress: 100,
        processingProgress: processingSteps[0].progress,
        stepMessage: processingSteps[0].msg,
      }));

      const stepInterval = setInterval(() => {
        currentStepIdx = Math.min(currentStepIdx + 1, processingSteps.length - 1);
        setTask(prev => ({
          ...prev,
          processingProgress: processingSteps[currentStepIdx].progress,
          stepMessage: processingSteps[currentStepIdx].msg,
        }));
      }, 900);

      // Format media payload
      const combinedUrls = uploadedItems.map(i => i.url).join(',');
      const combinedTypes = uploadedItems.map(i => i.type).join(',');

      // Invoke server action post creation
      const result = await createPost({
        content: postData.content,
        postType: postData.postType,
        toleeIds: postData.selectedToleeIds,
        media: uploadedItems.length > 0 ? { type: combinedTypes, url: combinedUrls } : null,
        location: postData.location || null,
        subLocation: postData.subLocation || null,
        isAnonymous: !!postData.isAnonymous,
        // News fields
        headline: postData.headline,
        summary: postData.summary,
        category: postData.category,
        metaDescription: postData.metaDescription,
        keywords: postData.keywords,
        tags: postData.tags,
      });

      clearInterval(stepInterval);

      if (!result.success) {
        throw new Error(result.error || `Unable to publish ${uploadType === 'reel' ? 'reel' : 'post'}. Please try again.`);
      }

      // Success
      let typeLabel = uploadType === 'reel' ? 'reel' : 'post';
      if (postData?.postType === 'requirement') {
        typeLabel = 'requirement';
      }
      setTask(prev => ({
        ...prev,
        state: 'success',
        totalProgress: 100,
        successMessage: `✅ Your ${typeLabel} has been published successfully.`,
      }));

      if (onSuccessCallback && result.post) {
        onSuccessCallback(result.post, postData);
      }

      // Disappear after 4 seconds
      setTimeout(() => {
        setTask(prev => {
          if (prev.state === 'success') {
            return { ...prev, state: 'idle' };
          }
          return prev;
        });
      }, 4000);

    } catch (err: any) {
      console.error('Error during global upload:', err);
      setTask(prev => ({
        ...prev,
        state: 'error',
        errorMessage: err.message || `Unable to publish ${uploadType === 'reel' ? 'reel' : 'post'}. Please try again.`,
      }));
    }
  };

  const startUpload = (
    mediaItems: MediaItem[],
    postData: any,
    uploadType: 'feed' | 'reel',
    onSuccessCallback?: any
  ) => {
    executeUpload(mediaItems, postData, uploadType, onSuccessCallback);
  };

  const retryUpload = () => {
    if (retryParamsRef.current) {
      const { mediaItems, postData, uploadType, onSuccessCallback } = retryParamsRef.current;
      executeUpload(mediaItems, postData, uploadType, onSuccessCallback);
    }
  };

  const cancelUpload = () => {
    setTask({
      mediaItems: [],
      filesCount: 0,
      currentFileIndex: 0,
      currentProgress: 0,
      totalProgress: 0,
      state: 'idle',
      uploadType: 'feed',
    });
    retryParamsRef.current = null;
  };

  return (
    <UploadContext.Provider value={{ task, startUpload, retryUpload, cancelUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
