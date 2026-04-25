import { useState, useEffect } from 'react';
import { DeviceDetectionEngine, DeviceType } from '../core/services/DeviceDetectionEngine';

export const useDevice = () => {
  const [device, setDevice] = useState<DeviceType>(DeviceDetectionEngine.getDeviceType());

  useEffect(() => {
    const handleResize = () => {
      setDevice(DeviceDetectionEngine.getDeviceType());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    device,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop'
  };
};