import { AsyncLocalStorage } from 'async_hooks';

const tokenStorage = new AsyncLocalStorage<string>();

/**
 * Run a function with the given auth token in context
 */
export function runWithToken<T>(token: string, fn: () => T): T {
  return tokenStorage.run(token, fn);
}

/**
 * Get the current auth token from context
 */
export function getToken(): string | undefined {
  return tokenStorage.getStore();
}
