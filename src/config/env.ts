import { ENV as unifiedENV } from './environment.js';

export function getTestUser(role: 'buyer' | 'seller1' | 'seller2') {
  return unifiedENV.getTestUser(role);
}

export function loadEnv(): void {
  console.warn('loadEnv() is deprecated. Environment loads automatically via the singleton.');
}

export const ENV = unifiedENV;
