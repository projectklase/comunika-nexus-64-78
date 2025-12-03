import { useCallback, useRef, useEffect } from 'react';

// Import sound files
import winSound from '@/assets/sounds/battle/win_sound.mp3';
import loseSound from '@/assets/sounds/battle/lose_sound.mp3';
import swordAttackSound from '@/assets/sounds/battle/sword_attack.mp3';
import shieldDefenseSound from '@/assets/sounds/battle/shield_defense.mp3';
import swooshCardSound from '@/assets/sounds/battle/swoosh_card.mp3';
import cardDefeatedSound from '@/assets/sounds/battle/card_defeated.mp3';
import battleBgMusic from '@/assets/sounds/battle/Klash_of_Kards.mp3';

interface BattleSounds {
  playWinSound: () => void;
  playLoseSound: () => void;
  playAttackSound: () => void;
  playDefenseSound: () => void;
  playSwooshSound: () => void;
  playCardDefeatedSound: () => void;
  playBattleMusic: () => void;
  stopBattleMusic: () => void;
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
    battleBg: new Audio(battleBgMusic),
  });

  const volume = useRef(0.5); // Default volume 50%
  const bgMusicVolume = 0.25; // Background music at 25%

  // Configure battle background music
  useEffect(() => {
    const bgAudio = audioRefs.current.battleBg;
    bgAudio.loop = true;
    bgAudio.volume = bgMusicVolume;
  }, []);

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

  const playBattleMusic = useCallback(() => {
    const bgAudio = audioRefs.current.battleBg;
    if (bgAudio.paused) {
      bgAudio.volume = bgMusicVolume;
      bgAudio.play().catch(err => console.warn('Failed to play battle music:', err));
    }
  }, []);

  const stopBattleMusic = useCallback(() => {
    const bgAudio = audioRefs.current.battleBg;
    if (!bgAudio.paused) {
      bgAudio.pause();
      bgAudio.currentTime = 0;
    }
  }, []);

  const stopAllSounds = useCallback(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    volume.current = Math.max(0, Math.min(1, newVolume)); // Clamp between 0 and 1
    // Don't change background music volume - keep it fixed at 25%
    Object.entries(audioRefs.current).forEach(([key, audio]) => {
      if (key !== 'battleBg') {
        audio.volume = volume.current;
      }
    });
  }, []);

  return {
    playWinSound,
    playLoseSound,
    playAttackSound,
    playDefenseSound,
    playSwooshSound,
    playCardDefeatedSound,
    playBattleMusic,
    stopBattleMusic,
    stopAllSounds,
    setVolume,
  };
};
