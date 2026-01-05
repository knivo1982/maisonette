// Centralized API configuration
// Use relative URL in production (same domain), env variable in development

// Production URL for native app
const PRODUCTION_URL = 'https://booking.lamaisonettepaestum.com';

// Check if running inside Capacitor (native app)
const isNativeApp = () => {
  try {
    // Check for Capacitor
    if (typeof window !== 'undefined') {
      if (window.Capacitor) return true;
      if (window.location.protocol === 'capacitor:') return true;
      if (window.location.protocol === 'ionic:') return true;
      // iOS WKWebView uses file: or capacitor:
      if (window.location.protocol === 'file:') return true;
      // Check hostname for Capacitor
      if (window.location.hostname === 'localhost' && window.navigator.userAgent.includes('Mobile')) return true;
    }
  } catch (e) {
    console.log('Error checking native app:', e);
  }
  return false;
};

const getApiUrl = () => {
  // In native app, always use production URL
  if (isNativeApp()) {
    console.log('Native app detected, using production API');
    return `${PRODUCTION_URL}/api`;
  }
  // In production web, use relative URLs (same domain)
  if (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.includes('preview.emergentagent.com')) {
    return '/api';
  }
  // In development/preview, use the env variable
  return `${process.env.REACT_APP_BACKEND_URL}/api`;
};

const getBaseUrl = () => {
  // In native app, always use production URL
  if (isNativeApp()) {
    return PRODUCTION_URL;
  }
  if (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.includes('preview.emergentagent.com')) {
    return '';
  }
  return process.env.REACT_APP_BACKEND_URL || '';
};

export const API = getApiUrl();
export const BASE_URL = getBaseUrl();

console.log('API URL:', API);
console.log('BASE URL:', BASE_URL);
