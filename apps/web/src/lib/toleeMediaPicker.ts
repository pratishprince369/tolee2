import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface ToleeMediaAsset {
  uri: string;
  type: 'image' | 'video';
  file?: File;
  name?: string;
  size?: number;
  duration?: number; // duration in seconds
  width?: number;
  height?: number;
  thumbnail?: string;
}

export interface MediaPickerOptions {
  mode?: 'all' | 'photos' | 'videos';
  multiple?: boolean;
  limit?: number; // 0 = unlimited
}

/**
 * Extracts duration, width, and height from a video File without uploading or full playback
 */
export function getVideoMetadata(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ duration: 0, width: 0, height: 0 });
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const dur = video.duration || 0;
      const w = video.videoWidth || 0;
      const h = video.videoHeight || 0;
      URL.revokeObjectURL(url);
      resolve({ duration: dur, width: w, height: h });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: 0, width: 0, height: 0 });
    };
    video.src = url;
  });
}

/**
 * Extracts width and height from an image File
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      URL.revokeObjectURL(url);
      resolve({ width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

/**
 * Launches native photo/video picker on Capacitor Android (PickVisualMedia) and iOS (PHPicker)
 */
async function pickVisualMediaNative(options: MediaPickerOptions = {}): Promise<ToleeMediaAsset[]> {
  const mediaType = options.mode === 'videos'
    ? MediaTypeSelection.Video
    : options.mode === 'photos'
      ? MediaTypeSelection.Photo
      : MediaTypeSelection.All;

  const result = await Camera.chooseFromGallery({
    mediaType,
    allowMultipleSelection: options.multiple ?? true,
    limit: options.limit ?? 0,
    includeMetadata: true,
  });

  if (!result || !result.results || result.results.length === 0) {
    return [];
  }

  const assets: ToleeMediaAsset[] = [];
  for (let i = 0; i < result.results.length; i++) {
    const item = result.results[i];
    const isVideo = item.type === 1; // MediaType.Video is 1, Photo is 0
    const mediaUri = item.webPath || item.uri || '';

    let file: File | undefined;
    try {
      if (mediaUri) {
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const ext = isVideo ? 'mp4' : 'jpg';
        const mime = blob.type || (isVideo ? 'video/mp4' : 'image/jpeg');
        file = new File([blob], `tolee_reel_${Date.now()}_${i}.${ext}`, { type: mime });
      }
    } catch (e) {
      console.warn('[ToleeMediaPicker] Could not fetch file from uri:', e);
    }

    const duration = (item.metadata as any)?.duration || 0;
    const width = (item.metadata as any)?.resolution?.width || 0;
    const height = (item.metadata as any)?.resolution?.height || 0;

    assets.push({
      uri: mediaUri,
      type: isVideo ? 'video' : 'image',
      file,
      name: file?.name || `tolee_reel_${i}`,
      size: (item.metadata as any)?.size || file?.size || 0,
      duration,
      width,
      height,
      thumbnail: item.thumbnail,
    });
  }

  return assets;
}

/**
 * Launches visual media picker using HTML5 file input with clean MIME wildcards.
 * Note: accept is strictly set to "image/*,video/*" without raw file extensions
 * (.mp4, .mov, etc.) so Android Chrome/WebView triggers the System Photo Picker
 * instead of the Android File Manager / DocumentsUI.
 */
function pickVisualMediaWeb(options: MediaPickerOptions = {}): Promise<ToleeMediaAsset[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve([]);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    if (options.mode === 'videos') {
      input.accept = 'video/*';
    } else if (options.mode === 'photos') {
      input.accept = 'image/*';
    } else {
      input.accept = 'image/*,video/*';
    }

    input.multiple = options.multiple ?? true;

    let resolved = false;

    const cleanup = () => {
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    input.onchange = async () => {
      if (resolved) return;
      resolved = true;

      const files = input.files;
      if (!files || files.length === 0) {
        cleanup();
        resolve([]);
        return;
      }

      const assets: ToleeMediaAsset[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|m4v)$/i.test(file.name);
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
        if (!isVideo && !isImage) continue;

        let duration = 0;
        let width = 0;
        let height = 0;

        if (isVideo) {
          try {
            const meta = await getVideoMetadata(file);
            duration = meta.duration;
            width = meta.width;
            height = meta.height;
          } catch (e) {
            console.warn('[ToleeMediaPicker] Video metadata error:', e);
          }
        } else if (isImage) {
          try {
            const dims = await getImageDimensions(file);
            width = dims.width;
            height = dims.height;
          } catch (e) {
            console.warn('[ToleeMediaPicker] Image dimensions error:', e);
          }
        }

        assets.push({
          uri: URL.createObjectURL(file),
          type: isVideo ? 'video' : 'image',
          file,
          name: file.name,
          size: file.size,
          duration,
          width,
          height,
        });
      }

      cleanup();
      resolve(assets);
    };

    input.oncancel = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve([]);
    };

    // Append temporarily to DOM (required by Android WebViews)
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Reusable cross-platform visual media picker abstraction
 */
export const ToleeMediaPicker = {
  /**
   * Opens the system/native visual media picker (Android Photo Picker / iOS PHPicker / Web)
   */
  async openMediaPicker(options: MediaPickerOptions = {}): Promise<ToleeMediaAsset[]> {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        return await pickVisualMediaNative(options);
      } catch (err: any) {
        // If user cancelled, smoothly return empty array
        const msg = String(err?.message || '');
        if (msg.includes('cancelled') || msg.includes('cancel') || err?.code === 'OS-PLUG-CAMR-0020') {
          return [];
        }
        console.warn('[ToleeMediaPicker] Native picker fallback:', err);
        return await pickVisualMediaWeb(options);
      }
    }

    return await pickVisualMediaWeb(options);
  },

  /**
   * Select a single image
   */
  async selectImage(options?: Omit<MediaPickerOptions, 'mode' | 'multiple'>): Promise<ToleeMediaAsset | null> {
    const results = await this.openMediaPicker({ ...options, mode: 'photos', multiple: false });
    return results[0] || null;
  },

  /**
   * Select a single video
   */
  async selectVideo(options?: Omit<MediaPickerOptions, 'mode' | 'multiple'>): Promise<ToleeMediaAsset | null> {
    const results = await this.openMediaPicker({ ...options, mode: 'videos', multiple: false });
    return results[0] || null;
  },

  /**
   * Select visual media (both images and videos)
   */
  async selectImageAndVideo(options?: Omit<MediaPickerOptions, 'mode'>): Promise<ToleeMediaAsset[]> {
    return await this.openMediaPicker({ ...options, mode: 'all' });
  },

  /**
   * Select multiple media items
   */
  async selectMultipleMedia(options?: Omit<MediaPickerOptions, 'multiple'>): Promise<ToleeMediaAsset[]> {
    return await this.openMediaPicker({ ...options, multiple: true });
  },
};
