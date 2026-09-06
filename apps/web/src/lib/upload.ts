export interface UploadResponse {
  secure_url: string;      // Optimized URL
  original_url: string;    // Original secure URL
  public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  eager?: any[];
}

/**
 * Centrally manages direct client-side uploads to Cloudinary.
 * Implements an automatic failover rotation mechanism: if an upload fails on the current account
 * (e.g. due to credit/quota exhaustion), it requests a backend rotation to the next active account
 * and retries the upload process up to 9 times.
 *
 * @param file The file to upload.
 * @param onProgress Callback to track upload progress (0-100).
 * @param retryCount The current retry attempt (used internally).
 * @returns Promise<UploadResponse>
 */
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
  retryCount = 0,
  abortSignal?: AbortSignal
): Promise<UploadResponse> {
  const maxRetries = 9;
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'auto';

  if (abortSignal?.aborted) {
    throw new Error('Upload aborted by user');
  }

  // 1. Get Signature & Active Account Details
  const sigUrl = isVideo ? '/api/upload-signature?type=video' : '/api/upload-signature';
  const sigRes = await fetch(sigUrl, { signal: abortSignal });
  if (!sigRes.ok) {
    throw new Error(`Failed to retrieve upload signature (Status: ${sigRes.status})`);
  }
  
  const sigData = await sigRes.json();
  if (!sigData.success) {
    throw new Error(`Failed to generate upload signature: ${sigData.error || 'Unknown error'}`);
  }

  const { apiKey, timestamp, signature, cloudName, index: activeIndex } = sigData;

  // 2. Direct Upload to Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', 'tolee_uploads');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  try {
    const uploadData = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      if (abortSignal) {
        const onAbort = () => {
          xhr.abort();
          reject(new Error('Upload aborted by user'));
        };
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (err) {
            reject(new Error(`Failed to parse Cloudinary response: ${err}`));
          }
        } else {
          reject(new Error(`Cloudinary upload failed with status ${xhr.status}: ${xhr.statusText || xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during Cloudinary upload'));
      };

      xhr.onabort = () => {
        reject(new Error('Upload aborted by user'));
      };

      xhr.send(formData);
    });

    // 3. Optimize secure_url (Auto-Compression & Universal MP4 format)
    let optimizedUrl = uploadData.secure_url;
    if (isVideo) {
      // Ensure universal direct MP4 playback on all browsers (never .m3u8)
      if (optimizedUrl.includes('.m3u8')) {
        optimizedUrl = optimizedUrl.replace('/sp_hd/', '/').replace(/\.m3u8(\?.*)?$/i, '.mp4$1');
      }
    } else if (optimizedUrl && optimizedUrl.includes('/upload/')) {
      // Fallback for images: inject auto-format and auto-quality
      optimizedUrl = optimizedUrl.replace('/upload/', '/upload/q_auto,f_auto/');
    }

    return {
      secure_url: optimizedUrl,
      original_url: uploadData.secure_url,
      public_id: uploadData.public_id,
      resource_type: uploadData.resource_type || (isVideo ? 'video' : 'image'),
      eager: uploadData.eager,
    };

  } catch (error: any) {
    if (abortSignal?.aborted || error?.message?.includes('aborted')) {
      throw error;
    }

    console.warn(`[CLOUDINARY CLIENT UPLOAD ERROR] Error occurred on account index ${activeIndex} (${cloudName}). Retrying with rotation...`, error);
    
    if (retryCount >= maxRetries) {
      throw new Error(`Cloudinary upload failed after ${maxRetries} rotation attempts: ${error}`);
    }

    // 4. Trigger Dynamic Failover Rotation in the Backend
    try {
      const rotationRes = await fetch('/api/cloudinary-failover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failedIndex: activeIndex, failedCloudName: cloudName }),
      });
      
      if (rotationRes.ok) {
        const rotationData = await rotationRes.json();
        console.log(`[CLOUDINARY CLIENT UPLOAD] Failover rotation result:`, rotationData);
      }
    } catch (rotationErr) {
      console.error('[CLOUDINARY CLIENT UPLOAD] Failed to trigger backend rotation:', rotationErr);
    }

    // 5. Recursively retry upload (gets a new signature for the next account)
    return uploadFile(file, onProgress, retryCount + 1, abortSignal);
  }
}
