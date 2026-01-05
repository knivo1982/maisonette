// Centralized API configuration
// Use relative URL in production (same domain), env variable in development

// Check if running inside Capacitor (native app)
const isCapacitorApp = () => {
  return window.Capacitor !== undefined || 
         window.location.protocol === 'capacitor:' ||
         window.location.hostname === 'lamaisonettepaestum.com' ||
         window.location.hostname === 'localhost';
};

const PRODUCTION_URL = 'https://booking.lamaisonettepaestum.com';

const getApiUrl = () => {
  // In Capacitor native app, always use production URL
  if (isCapacitorApp() && window.Capacitor !== undefined) {
    return `${PRODUCTION_URL}/api`;
  }
  // In production web, use relative URLs (same domain)
  if (window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.includes('preview.emergentagent.com')) {
    return '/api';
  }
  // In development/preview, use the env variable
  return `${process.env.REACT_APP_BACKEND_URL}/api`;
};

const getBaseUrl = () => {
  // In Capacitor native app, always use production URL
  if (isCapacitorApp() && window.Capacitor !== undefined) {
    return PRODUCTION_URL;
  }
  if (window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.includes('preview.emergentagent.com')) {
    return '';
  }
  return process.env.REACT_APP_BACKEND_URL || '';
};

export const API = getApiUrl();
export const BASE_URL = getBaseUrl();
