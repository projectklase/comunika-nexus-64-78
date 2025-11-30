import { useCallback, useRef } from 'react';

// Import sound files
import winSound from '@/assets/sounds/battle/win_sound.mp3';
import loseSound from '@/assets/sounds/battle/lose_sound.mp3';
import swordAttackSound from '@/assets/sounds/battle/sword_attack.mp3';
import shieldDefenseSound from '@/assets/sounds/battle/shield_defense.mp3';
import swooshCardSound from '@/assets/sounds/battle/swoosh_card.mp3';
import cardDefeatedSound from '@/assets/sounds/battle/card_defeated.mp3';

interface BattleSounds {
  playWinSound: () => void;
  playLoseSound: () => void;
  playAttackSound: () => void;
  playDefenseSound: () => void;
  playSwooshSound: () => void;
  playCardDefeatedSound: () => void;
  stopAllSounds: () => void;
  setVolume: (volume: number) => void;
}

export const useBattleSounds = (): BattleSounds => {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({
    win: new Audio(winSound),
    lose: new Audio(loseSound),
    attack: new Audio(swordAttackSound),
    defense: new Audio(shieldDefenseSound),
    swoosh: new Audio(swooshCardSound),
    defeated: new Audio(cardDefeatedSound),
  });

  const volume = useRef(0.5); // Default volume 50%

  const playSound = useCallback((key: string) => {
    const audio = audioRefs.current[key];
    if (audio) {
      audio.currentTime = 0; // Reset to start
      audio.volume = volume.current;
      audio.play().catch(err => console.warn(`Failed to play ${key} sound:`, err));
    }
  }, []);

  const playWinSound = useCallback(() => {
    playSound('win');
  }, [playSound]);

  const playLoseSound = useCallback(() => {
    playSound('lose');
  }, [playSound]);

  const playAttackSound = useCallback(() => {
    playSound('attack');
  }, [playSound]);

  const playDefenseSound = useCallback(() => {
    playSound('defense');
  }, [playSound]);

  const playSwooshSound = useCallback(() => {
    playSound('swoosh');
  }, [playSound]);

  const playCardDefeatedSound = useCallback(() => {
    playSound('defeated');
  }, [playSound]);

  const stopAllSounds = useCallback(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    volume.current = Math.max(0, Math.min(1, newVolume)); // Clamp between 0 and 1
    Object.values(audioRefs.current).forEach(audio => {
      audio.volume = volume.current;
    });
  }, []);

  return {
    playWinSound,
    playLoseSound,
    playAttackSound,
    playDefenseSound,
    playSwooshSound,
    playCardDefeatedSound,
    stopAllSounds,
    setVolume,
  };
};
