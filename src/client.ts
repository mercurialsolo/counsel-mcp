import axios, { AxiosInstance } from 'axios';
import { AsyncLocalStorage } from 'async_hooks';
import { config } from './config.js';

// Request-scoped storage for auth token
interface RequestContext {
  token: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request's auth token from AsyncLocalStorage
 */
function getCurrentToken(): string | undefined {
  return requestContext.getStore()?.token;
}

/**
 * Pre-configured Axios client for Counsel API calls.
 * Automatically uses the Bearer token from the current request context.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: config.COUNSEL_API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'counsel-mcp-server/0.1.0'
  }
});

// Add request interceptor to inject the auth token from request context
apiClient.interceptors.request.use(async (reqConfig) => {
  const token = getCurrentToken();
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("Auth Warning: No token in request context. API call may fail.");
  }
  return reqConfig;
});
