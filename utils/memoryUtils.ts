import { Platform } from 'react-native';

// Memory management utilities to prevent crashes
export class MemoryManager {
  private static intervals: Set<NodeJS.Timeout> = new Set();
  private static timeouts: Set<NodeJS.Timeout> = new Set();
  private static listeners: Set<() => void> = new Set();

  // Track intervals to prevent memory leaks
  static trackInterval(interval: NodeJS.Timeout): NodeJS.Timeout {
    this.intervals.add(interval);
    return interval;
  }

  // Track timeouts to prevent memory leaks
  static trackTimeout(timeout: NodeJS.Timeout): NodeJS.Timeout {
    this.timeouts.add(timeout);
    return timeout;
  }

  // Track cleanup functions
  static trackListener(cleanup: () => void): () => void {
    this.listeners.add(cleanup);
    return cleanup;
  }

  // Clear a specific interval
  static clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  // Clear a specific timeout
  static clearTimeout(timeout: NodeJS.Timeout): void {
    clearTimeout(timeout);
    this.timeouts.delete(timeout);
  }

  // Remove a specific listener
  static removeListener(cleanup: () => void): void {
    try {
      cleanup();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    this.listeners.delete(cleanup);
  }

  // Clean up all tracked resources
  static cleanupAll(): void {
    console.log('MemoryManager: Cleaning up all resources');
    
    // Clear all intervals
    this.intervals.forEach(interval => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.error('Error clearing interval:', error);
      }
    });
    this.intervals.clear();

    // Clear all timeouts
    this.timeouts.forEach(timeout => {
      try {
        clearTimeout(timeout);
      } catch (error) {
        console.error('Error clearing timeout:', error);
      }
    });
    this.timeouts.clear();

    // Execute all cleanup functions
    this.listeners.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    this.listeners.clear();
  }

  // Get memory usage info (mobile only)
  static getMemoryInfo(): Promise<any> {
    if (Platform.OS === 'web') {
      return Promise.resolve({ available: 'unknown', used: 'unknown' });
    }
    
    // This would require a native module in a real app
    // For now, just return a placeholder
    return Promise.resolve({ available: 'unknown', used: 'unknown' });
  }

  // Force garbage collection (if available)
  static forceGarbageCollection(): void {
    if (global.gc) {
      try {
        global.gc();
        console.log('MemoryManager: Forced garbage collection');
      } catch (error) {
        console.error('Error forcing garbage collection:', error);
      }
    }
  }
}

// Hook for automatic cleanup on component unmount
export function useMemoryCleanup(cleanupFn: () => void): () => void {
  const cleanup = MemoryManager.trackListener(cleanupFn);
  
  // Return cleanup function for manual use
  return cleanup;
}

// Debounce function to prevent excessive calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      MemoryManager.clearTimeout(timeout);
    }
    
    timeout = MemoryManager.trackTimeout(
      setTimeout(() => {
        func(...args);
        if (timeout) {
          MemoryManager.clearTimeout(timeout);
        }
      }, wait) as any
    );
  };
}

// Throttle function to limit call frequency
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      const timeout = MemoryManager.trackTimeout(
        setTimeout(() => {
          inThrottle = false;
          MemoryManager.clearTimeout(timeout);
        }, limit) as any
      );
    }
  };
}