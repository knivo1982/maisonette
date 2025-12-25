// Centralized API configuration
// Use relative URL in production (same domain), env variable in development

const getApiUrl = () => {
  // In production, use relative URLs (same domain)
  if (window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.includes('preview.emergentagent.com')) {
    return '/api';
  }
  // In development/preview, use the env variable
  return `${process.env.REACT_APP_BACKEND_URL}/api`;
};

const getBaseUrl = () => {
  if (window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.includes('preview.emergentagent.com')) {
    return '';
  }
  return process.env.REACT_APP_BACKEND_URL || '';
};

export const API = getApiUrl();
export const BASE_URL = getBaseUrl();
