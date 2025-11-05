import { useEffect } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSettingsStore } from '@/store/settingsStore';

export function useKeepAwake() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web implementation using Wake Lock API
      let wakeLock: WakeLockSentinel | null = null;

      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator && settings.keepScreenAwake) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
            console.log('Wake lock activated on web');
          }
        } catch (err) {
          console.log('Wake lock failed on web:', err);
        }
      };

      const releaseWakeLock = () => {
        if (wakeLock) {
          wakeLock.release();
          wakeLock = null;
          console.log('Wake lock released on web');
        }
      };

      if (settings.keepScreenAwake) {
        requestWakeLock();
      } else {
        releaseWakeLock();
      }

      // Handle visibility change
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && settings.keepScreenAwake) {
          requestWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        releaseWakeLock();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      // Native implementation using expo-keep-awake with error handling
      let isActive = false;
      
      const activateKeepAwake = async () => {
        try {
          if (settings.keepScreenAwake && !isActive) {
            await activateKeepAwakeAsync('SetMaster-KeepAwake');
            isActive = true;
            console.log('Keep awake activated');
          }
        } catch (err) {
          console.log('Keep awake activation failed:', err);
          // Don't throw error, just log it
        }
      };

      const deactivateKeepAwakeFunc = () => {
        try {
          if (isActive) {
            deactivateKeepAwake('SetMaster-KeepAwake');
            isActive = false;
            console.log('Keep awake deactivated');
          }
        } catch (err) {
          console.log('Keep awake deactivation failed:', err);
          // Don't throw error, just log it
        }
      };

      if (settings.keepScreenAwake) {
        activateKeepAwake();
      } else {
        deactivateKeepAwakeFunc();
      }

      return () => {
        deactivateKeepAwakeFunc();
      };
    }
  }, [settings.keepScreenAwake]);
}

// Hook specifically for performance screens (live mode, practice mode)
export function usePerformanceKeepAwake() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (!settings.keepScreenAwake) return;

    if (Platform.OS === 'web') {
      let wakeLock: WakeLockSentinel | null = null;

      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
            console.log('Performance wake lock activated on web');
          }
        } catch (err) {
          console.log('Performance wake lock failed on web:', err);
        }
      };

      requestWakeLock();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          requestWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (wakeLock) {
          wakeLock.release();
          console.log('Performance wake lock released on web');
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      // Native implementation with error handling
      let isActive = false;
      
      const activatePerformanceKeepAwake = async () => {
        try {
          if (!isActive) {
            await activateKeepAwakeAsync('SetMaster-Performance');
            isActive = true;
            console.log('Performance keep awake activated');
          }
        } catch (err) {
          console.log('Performance keep awake activation failed:', err);
          // Don't throw error, just log it
        }
      };

      const deactivatePerformanceKeepAwake = () => {
        try {
          if (isActive) {
            deactivateKeepAwake('SetMaster-Performance');
            isActive = false;
            console.log('Performance keep awake deactivated');
          }
        } catch (err) {
          console.log('Performance keep awake deactivation failed:', err);
          // Don't throw error, just log it
        }
      };

      activatePerformanceKeepAwake();

      return () => {
        deactivatePerformanceKeepAwake();
      };
    }
  }, [settings.keepScreenAwake]);
}