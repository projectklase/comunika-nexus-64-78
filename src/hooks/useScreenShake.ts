import { useState, useCallback } from 'react';

type ShakeIntensity = 'light' | 'medium' | 'heavy';

interface ScreenShakeOptions {
  intensity?: ShakeIntensity;
  duration?: number;
}

export const useScreenShake = () => {
  const [isShaking, setIsShaking] = useState(false);
  const [shakeClass, setShakeClass] = useState('');

  const triggerShake = useCallback(({ intensity = 'medium', duration = 500 }: ScreenShakeOptions = {}) => {
    const shakeClasses = {
      light: 'animate-screen-shake-light',
      medium: 'animate-screen-shake-medium',
      heavy: 'animate-screen-shake-heavy'
    };

    setShakeClass(shakeClasses[intensity]);
    setIsShaking(true);

    setTimeout(() => {
      setIsShaking(false);
      setShakeClass('');
    }, duration);
  }, []);

  return {
    isShaking,
    shakeClass,
    triggerShake
  };
};
