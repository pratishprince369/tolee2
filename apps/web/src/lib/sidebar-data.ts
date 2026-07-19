import { getSidebarData as getSidebarDataAction } from '@/actions/user';

let cache: any = null;
let cacheTime = 0;
let pendingPromise: Promise<any> | null = null;

export async function getSidebarDataCached(forceRefresh = false) {
  const now = Date.now();
  // Cache for 3 seconds to prevent duplicate simultaneous fetches on mount/route changes
  if (!forceRefresh && cache && (now - cacheTime < 3000)) {
    return cache;
  }
  if (pendingPromise) {
    return pendingPromise;
  }
  
  pendingPromise = getSidebarDataAction().then((res) => {
    if (res.success) {
      cache = res;
      cacheTime = Date.now();
    }
    pendingPromise = null;
    return res;
  }).catch((err) => {
    pendingPromise = null;
    throw err;
  });
  
  return pendingPromise;
}
