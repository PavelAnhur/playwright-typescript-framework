import { ENV } from "@config/env";

/**
 * Centralized timeout configuration for the test framework.
 * Different timeouts for different environments (local, CI, staging).
 */
export const TIMEOUTS = {
  /**
   * Very short timeout for quick existence checks
   * Use when you just want to check if an element exists without waiting
   */
  VERY_SHORT: 10,

  /**
   * Short timeout for simple operations
   * Use for quick visibility checks and fast interactions
   */
  SHORT: 1000,

  /**
   * Medium timeout for typical wait operations
   * Use for standard element visibility and state changes
   */
  MEDIUM: 3000,

  /**
   * Long timeout for slow operations
   * Use for network requests, API calls, and complex animations
   */
  LONG: 5000,

  /**
   * Extra long timeout for very slow operations
   * Use for page loads, third-party integrations, and CI environments
   */
  EXTRA_LONG: 10000,

  /**
   * Timeout for page navigation
   */
  NAVIGATION: 30000,

  /**
   * Timeout for network idle state
   */
  NETWORK_IDLE: 5000,

  /**
   * Timeout for DOM content loaded
   */
  DOM_CONTENT_LOADED: 30000,
} as const;

/**
 * Get environment-appropriate timeouts
 * CI environments get longer timeouts
 */
export function getTimeouts() {
  if (ENV.isCI) {
    return {
      ...TIMEOUTS,
      SHORT: 2000,
      MEDIUM: 5000,
      LONG: 10000,
      EXTRA_LONG: 15000,
    };
  }

  if (ENV.isStaging) {
    return {
      ...TIMEOUTS,
      SHORT: 1500,
      MEDIUM: 4000,
      LONG: 8000,
    };
  }

  return TIMEOUTS;
}

/**
 * Default timeouts for common operations
 */
export const DEFAULT_TIMEOUTS = getTimeouts();

/**
 * Alias for DEFAULT_TIMEOUTS for convenience
 */
export const T = DEFAULT_TIMEOUTS;