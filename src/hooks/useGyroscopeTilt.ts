import { useState, useEffect, useCallback } from 'react';

interface GyroscopeTilt {
  tiltX: number;
  tiltY: number;
  gyroEnabled: boolean;
  needsPermission: boolean;
  requestPermission: () => Promise<void>;
}

export const useGyroscopeTilt = (enabled: boolean = true): GyroscopeTilt => {
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.gamma !== null && e.beta !== null) {
      // Primeiro dado válido - confirma que giroscópio funciona
      if (!gyroEnabled) {
        setGyroEnabled(true);
      }
      
      // Efeito sutil: máximo ±12° de inclinação
      const clampedGamma = Math.max(-12, Math.min(12, e.gamma * 0.25));
      const clampedBeta = Math.max(-12, Math.min(12, (e.beta - 45) * 0.25));
      
      setTiltY(clampedGamma);
      setTiltX(-clampedBeta);
    }
  }, [gyroEnabled]);

  const requestPermission = useCallback(async () => {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation);
        setGyroEnabled(true);
        setNeedsPermission(false);
      }
    } catch (e) {
      console.log('Giroscópio não disponível');
    }
  }, [handleOrientation]);

  useEffect(() => {
    if (!enabled) return;

    // Detecta se precisa permissão (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setNeedsPermission(true);
    } else if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      // Registra listener mas NÃO marca como enabled ainda
      // Será marcado apenas quando receber dados reais (no handleOrientation)
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [enabled, handleOrientation]);

  return {
    tiltX,
    tiltY,
    gyroEnabled,
    needsPermission,
    requestPermission,
  };
};
