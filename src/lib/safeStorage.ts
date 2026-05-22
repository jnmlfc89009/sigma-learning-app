/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SafeLocalStorage {
  private memoryStore: Record<string, string> = {};

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
      }
    } catch (e) {
      console.warn("localStorage is blocked or restricted in this browser session. Using memory-fallback.");
    }
  }

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Ignore security/access error
    }
    return this.memoryStore[key] !== undefined ? this.memoryStore[key] : null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      // Ignore security/access error
    }
    this.memoryStore[key] = String(value);
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      // Ignore security/access error
    }
    delete this.memoryStore[key];
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      // Ignore security/access error
    }
    this.memoryStore = {};
  }
}

export const safeStorage = new SafeLocalStorage();
