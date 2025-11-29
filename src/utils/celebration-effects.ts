import confetti from 'canvas-confetti';

/**
 * Celebration Effects - Canvas Confetti Customizado por Raridade
 * Sistema progressivo de confetti que escala de COMMON até LEGENDARY
 */

// COMMON: Confetti verde simples
export const celebrateCommon = () => {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#4ade80', '#86efac'],
    zIndex: 9999,
  });
};

// UNCOMMON: Confetti verde com azul
export const celebrateUncommon = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#4ade80', '#3b82f6', '#60a5fa'],
    zIndex: 9999,
    startVelocity: 35,
  });
};

// RARE: Confetti azul em ondas
export const celebrateRare = () => {
  const duration = 3000;
  const end = Date.now() + duration;
  
  (function frame() {
    confetti({
      particleCount: 30,
      spread: 80,
      origin: { x: Math.random(), y: Math.random() * 0.5 },
      colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff'],
      zIndex: 9999,
      startVelocity: 25,
    });
    
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

// EPIC: Explosão roxa + estrelas laterais
export const celebrateEpic = () => {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  
  // Burst central
  confetti({
    ...defaults,
    particleCount: 100,
    spread: 100,
    origin: { y: 0.5 },
    colors: ['#a855f7', '#c084fc', '#e879f9', '#f0abfc'],
  });
  
  // Estrelas laterais com delay
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ['#f472b6', '#fbbf24', '#ffffff'],
    });
    confetti({
      ...defaults,
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ['#f472b6', '#fbbf24', '#ffffff'],
    });
  }, 300);

  // Burst extra no topo
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      spread: 120,
      origin: { x: 0.5, y: 0.3 },
      colors: ['#a855f7', '#e879f9', '#ffffff'],
    });
  }, 600);
};

// LEGENDARY: Explosão épica dourada + fireworks + chuva de estrelas
export const celebrateLegendary = () => {
  const duration = 5000;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  // Onda 1: Explosão central dourada gigante
  confetti({
    ...defaults,
    particleCount: 150,
    origin: { x: 0.5, y: 0.5 },
    colors: ['#fbbf24', '#f59e0b', '#facc15', '#fef08a', '#ffffff'],
    scalar: 1.2,
  });

  // Onda 2: Fireworks dos cantos (T+500ms)
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      origin: { x: 0.1, y: 0.3 },
      colors: ['#fbbf24', '#ffffff', '#fef08a'],
      scalar: 1.1,
    });
    confetti({
      ...defaults,
      particleCount: 80,
      origin: { x: 0.9, y: 0.3 },
      colors: ['#fbbf24', '#ffffff', '#fef08a'],
      scalar: 1.1,
    });
  }, 500);

  // Onda 3: Chuva de estrelas cadentes (T+1000ms, duração 2s)
  setTimeout(() => {
    const starEnd = Date.now() + 2000;
    
    (function frameStars() {
      confetti({
        particleCount: 5,
        angle: 90,
        spread: 150,
        origin: { x: Math.random(), y: -0.1 },
        colors: ['#fbbf24', '#ffffff', '#fef08a'],
        shapes: ['star'],
        gravity: 1.5,
        scalar: 1.4,
        ticks: 200,
        zIndex: 9999,
      });
      
      if (Date.now() < starEnd) {
        requestAnimationFrame(frameStars);
      }
    })();
  }, 1000);

  // Onda 4: Explosões laterais contínuas (T+1500ms até final)
  setTimeout(() => {
    const lateralEnd = Date.now() + 2000;
    
    (function frameLateral() {
      const side = Math.random() > 0.5 ? 0.1 : 0.9;
      confetti({
        ...defaults,
        particleCount: 40,
        origin: { x: side, y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#ffffff'],
        spread: 80,
        startVelocity: 25,
      });
      
      if (Date.now() < lateralEnd) {
        setTimeout(frameLateral, 400);
      }
    })();
  }, 1500);

  // Onda 5: Explosão final no centro (T+3500ms)
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 200,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#fbbf24', '#facc15', '#fef08a', '#ffffff'],
      spread: 360,
      scalar: 1.5,
      startVelocity: 40,
    });
  }, 3500);
};

/**
 * Função principal que dispara celebração baseada na raridade
 */
export const triggerCelebration = (rarity: string) => {
  switch (rarity) {
    case 'LEGENDARY':
      celebrateLegendary();
      break;
    case 'EPIC':
      celebrateEpic();
      break;
    case 'RARE':
      celebrateRare();
      break;
    case 'UNCOMMON':
      celebrateUncommon();
      break;
    case 'COMMON':
    default:
      celebrateCommon();
      break;
  }
};
