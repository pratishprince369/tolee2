/**
 * Tolee Radar — Native & Browser Location Engine
 * Handles full permission lifecycle across Android Native App (Capacitor/WebView) and Mobile/Desktop Browsers.
 */

export type RadarPermissionState =
  | 'NOT_DETERMINED'
  | 'GRANTED'
  | 'DENIED'
  | 'BLOCKED'
  | 'LOCATION_SERVICES_DISABLED'
  | 'ERROR'
  | 'LOADING';

export interface RadarGeoCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * Check whether the native Android app bridge is available in window
 */
export function getNativeBridge(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).AndroidBridge || (window as any).ToleeNative || null;
}

/**
 * Check current location permission state across Native App and Browser
 */
export async function checkRadarLocationPermission(): Promise<RadarPermissionState> {
  if (typeof window === 'undefined') return 'NOT_DETERMINED';

  // 1. Native Android Bridge
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.getLocationPermissionStatus === 'function') {
    try {
      const status = bridge.getLocationPermissionStatus();
      if (status) {
        return status as RadarPermissionState;
      }
    } catch (e) {
      console.warn('[RadarLocation] Error calling native getLocationPermissionStatus:', e);
    }
  }

  // 2. Capacitor Geolocation check
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      if (perm.location === 'granted' || (perm as any).coarseLocation === 'granted') {
        return 'GRANTED';
      }
      if (perm.location === 'denied' || (perm as any).coarseLocation === 'denied') {
        return 'DENIED';
      }
      return 'NOT_DETERMINED';
    }
  } catch (_) {}

  // 3. Web Permissions API (Modern Mobile / Desktop Browsers)
  if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (perm.state === 'granted') return 'GRANTED';
      if (perm.state === 'denied') return 'DENIED';
      return 'NOT_DETERMINED';
    } catch (_) {}
  }

  return 'NOT_DETERMINED';
}

/**
 * Request location permission explicitly from OS or Browser
 */
export function requestRadarLocationPermission(): Promise<RadarPermissionState> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('ERROR');
      return;
    }

    const bridge = getNativeBridge();
    if (bridge && typeof bridge.requestLocationPermission === 'function') {
      const timeout = setTimeout(async () => {
        const recheck = await checkRadarLocationPermission();
        resolve(recheck);
      }, 6000);

      (window as any).onLocationPermissionResult = (status: string) => {
        clearTimeout(timeout);
        delete (window as any).onLocationPermissionResult;
        resolve((status as RadarPermissionState) || 'DENIED');
      };

      try {
        bridge.requestLocationPermission();
        return;
      } catch (e) {
        clearTimeout(timeout);
        console.warn('[RadarLocation] Error calling bridge.requestLocationPermission:', e);
      }
    }

    // Fallback: Browser Geolocation will pop native OS/browser prompt on getCurrentPosition
    resolve('NOT_DETERMINED');
  });
}

/**
 * Open Device Location Settings (for LOCATION_SERVICES_DISABLED)
 */
export function openDeviceLocationSettings(): void {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.openLocationSettings === 'function') {
    try {
      bridge.openLocationSettings();
      return;
    } catch (e) {
      console.warn('[RadarLocation] Error opening location settings:', e);
    }
  }
}

/**
 * Open App Settings (for BLOCKED permissions)
 */
export function openDeviceAppSettings(): void {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.openAppSettings === 'function') {
    try {
      bridge.openAppSettings();
      return;
    } catch (e) {
      console.warn('[RadarLocation] Error opening app settings:', e);
    }
  }
}

/**
 * Acquire accurate real-time GPS coordinates
 */
export function getRadarAccurateGPS(timeoutMs = 12000): Promise<RadarGeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window unavailable'));
      return;
    }

    let isResolved = false;

    // 1. Try Native Android Location Bridge
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.getCurrentLocation === 'function') {
      const timer = setTimeout(() => {
        if (!isResolved) {
          fallbackToBrowserGeo();
        }
      }, 4000);

      (window as any).onNativeLocationSuccess = (data: { latitude: number; longitude: number; accuracy?: number }) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timer);
        delete (window as any).onNativeLocationSuccess;
        delete (window as any).onNativeLocationError;
        resolve({
          lat: data.latitude,
          lng: data.longitude,
          accuracy: data.accuracy || 10
        });
      };

      (window as any).onNativeLocationError = (errMsg: string) => {
        if (isResolved) return;
        clearTimeout(timer);
        delete (window as any).onNativeLocationSuccess;
        delete (window as any).onNativeLocationError;
        fallbackToBrowserGeo();
      };

      try {
        bridge.getCurrentLocation();
        return;
      } catch (e) {
        clearTimeout(timer);
      }
    }

    // Fallback: Browser / Capacitor standard Geolocation
    fallbackToBrowserGeo();

    function fallbackToBrowserGeo() {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        if (!isResolved) {
          isResolved = true;
          reject(new Error('Geolocation not supported on this device.'));
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isResolved) return;
          isResolved = true;
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 15
          });
        },
        (err) => {
          if (isResolved) return;
          isResolved = true;
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0
        }
      );
    }
  });
}