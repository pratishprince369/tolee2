import cloudinary from './cloudinary';

/**
 * Extracts the Cloudinary public ID from a given secure/insecure URL.
 * Matches directories, nested folders, transformation segments, and versioning.
 *
 * Examples:
 * https://res.cloudinary.com/demo/image/upload/v12345/folder/public_id.jpg => "folder/public_id"
 * https://res.cloudinary.com/demo/image/upload/w_200,h_200/v1/avatar.png => "avatar"
 * https://res.cloudinary.com/demo/image/upload/folder/subfolder/image.png => "folder/subfolder/image"
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return null;
  }
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    
    const pathSegments = parts[1].split('/');
    
    // 1. First, check if there is an explicit version segment (e.g., v1716382050).
    // If found, everything after it is part of the public ID and folders!
    const versionIndex = pathSegments.findIndex(segment => /^v\d+$/.test(segment));
    let remainingPath = '';
    
    if (versionIndex !== -1) {
      remainingPath = pathSegments.slice(versionIndex + 1).join('/');
    } else {
      // 2. If no version segment is found, fall back to scanner loop.
      // - Option segments: usually contain comma (,), equals (=), colon (:), or match known transformation codes.
      let startIndex = 0;
      while (startIndex < pathSegments.length) {
        const segment = pathSegments[startIndex];
        
        // Is it a version segment? (double-check fallback)
        if (/^v\d+$/.test(segment)) {
          startIndex++;
          break;
        }
        
        // Is it a transformation segment?
        if (
          segment.includes(',') || 
          segment.includes('=') || 
          segment.includes(':') ||
          /^(?:c|g|w|h|q|f|e|dpr|fl|sp|pg|bo|co|bg|cs|cm|br|ac|vs|b|a|o|x|y|l|u|p|r)_[a-z0-9_:]+$/i.test(segment) ||
          /^(?:so|eo|du|[a-z])$/i.test(segment) ||
          segment === 'authenticated' ||
          segment === 'sprite' ||
          segment === 'text' ||
          segment === 'multi'
        ) {
          startIndex++;
        } else {
          break;
        }
      }
      remainingPath = pathSegments.slice(startIndex).join('/');
    }
    
    // Remove the file extension if it exists
    const lastDotIndex = remainingPath.lastIndexOf('.');
    if (lastDotIndex !== -1 && lastDotIndex > remainingPath.lastIndexOf('/')) {
      return remainingPath.substring(0, lastDotIndex);
    }
    return remainingPath;
  } catch (error) {
    console.error('Failed to extract public ID from url:', url, error);
  }
  return null;
}

/**
 * Robustly parses/guesses the resource type of a Cloudinary asset based on its URL.
 * Cloudinary resource types are typically "image", "video", or "raw".
 */
export function extractResourceTypeFromUrl(url: string): string {
  if (!url || typeof url !== 'string') return 'image';
  
  if (url.includes('/video/')) return 'video';
  if (url.includes('/raw/')) return 'raw';
  
  return 'image';
}

/**
 * Securely deletes a single asset from Cloudinary.
 * Wrapped in a try/catch block to guarantee database transaction resilience.
 *
 * @param publicId The public ID of the Cloudinary asset.
 * @param resourceType The type of resource ("image" | "video" | "raw"). Defaults to "image".
 * @returns Promise<boolean> indicating whether deletion succeeded or resource was not found.
 */
export async function destroyAsset(publicIdOrUrl: string, resourceType: string = 'image'): Promise<boolean> {
  if (!publicIdOrUrl) return false;
  
  let publicId = publicIdOrUrl;
  let cloudName: string | undefined = undefined;

  if (publicIdOrUrl.includes('cloudinary.com')) {
    const parsedId = extractPublicIdFromUrl(publicIdOrUrl);
    if (parsedId) {
      publicId = parsedId;
    }
    const match = publicIdOrUrl.match(/res\.cloudinary\.com\/([^/]+)/);
    if (match) {
      cloudName = match[1];
    }
  }
  
  try {
    console.log(`[CLOUDINARY CLEANUP] Attempting to destroy asset: "${publicId}" (${resourceType}) on cloud: ${cloudName || 'active'}`);
    
    const { getAllCloudinaryAccounts, getActiveCloudinaryAccount } = require('./cloudinary-fallback');
    
    let account = null;
    if (cloudName) {
      const accounts = getAllCloudinaryAccounts();
      account = accounts.find((a: any) => a.cloudName === cloudName);
    }
    
    if (!account) {
      const activeSetup = await getActiveCloudinaryAccount();
      account = activeSetup.account;
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
      cloud_name: account.cloudName,
      api_key: account.apiKey,
      api_secret: account.apiSecret,
    });
    
    console.log(`[CLOUDINARY CLEANUP] Success for "${publicId}":`, result);
    return result.result === 'ok' || result.result === 'not_found';
  } catch (error) {
    // Database transaction resilience - log but do not throw
    console.error(`[CLOUDINARY CLEANUP ERROR] Failed to destroy asset "${publicId}":`, error);
    return false;
  }
}

/**
 * Securely deletes multiple assets from Cloudinary in parallel.
 * Guaranteed not to crash or interrupt database transactions.
 *
 * @param publicIds List of public IDs to destroy.
 * @param resourceTypes Optional matching list of resource types.
 * @returns Promise<boolean[]> status array corresponding to the input list.
 */
export async function destroyMultipleAssets(
  publicIds: string[], 
  resourceTypes?: string[]
): Promise<boolean[]> {
  if (!publicIds || publicIds.length === 0) return [];
  
  const promises = publicIds.map((id, index) => {
    const type = resourceTypes && resourceTypes[index] ? resourceTypes[index] : 'image';
    return destroyAsset(id, type);
  });
  
  return Promise.all(promises);
}
