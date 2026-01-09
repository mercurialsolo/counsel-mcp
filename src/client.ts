import axios, { AxiosInstance } from 'axios';
import { config } from './config.js';

/**
 * Get API key from environment variable
 */
function getApiKey(): string | undefined {
  return process.env.COUNSEL_API_KEY;
}

/**
 * Pre-configured Axios client for Counsel API calls.
 * Uses COUNSEL_API_KEY environment variable for authentication.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: config.COUNSEL_API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'counsel-mcp-server/0.1.0'
  }
});

// Add request interceptor to inject the auth token
apiClient.interceptors.request.use(async (reqConfig) => {
  const apiKey = getApiKey();
  if (apiKey) {
    reqConfig.headers.Authorization = `Bearer ${apiKey}`;
  }
  return reqConfig;
});
