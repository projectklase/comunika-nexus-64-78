import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: 'blue' | 'red' | 'purple';
}

export const BattleBackground = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate 30 floating particles with varied colors
    const colors: Array<'blue' | 'red' | 'purple'> = ['blue', 'red', 'purple'];
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
      color: colors[i % 3],
    }));
    setParticles(newParticles);
  }, []);

  const getParticleColor = (color: 'blue' | 'red' | 'purple') => {
    switch (color) {
      case 'blue': return 'bg-blue-400/30';
      case 'red': return 'bg-red-400/30';
      case 'purple': return 'bg-purple-400/30';
    }
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-background to-slate-900" />
      
      {/* Animated gradient overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-tr from-blue-950/30 via-transparent to-red-950/30"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {/* Diagonal energy lines */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <motion.div
          className="absolute w-[200%] h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent -rotate-45 origin-center"
          style={{ top: '30%', left: '-50%' }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute w-[200%] h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent -rotate-45 origin-center"
          style={{ top: '70%', left: '-50%' }}
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      
      {/* Mist/fog effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/40"
        animate={{ opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      
      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${getParticleColor(particle.color)} blur-sm`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-radial from-blue-500/10 to-transparent" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-radial from-red-500/10 to-transparent" />
      
      {/* Dramatic vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.8)_100%)]" />
    </div>
  );
};
