import { ENV as unifiedENV } from './environment.js';

export function getTestUser(role: 'buyer' | 'seller1' | 'seller2') {
  return unifiedENV.getTestUser(role);
}

export const ENV = unifiedENV;
