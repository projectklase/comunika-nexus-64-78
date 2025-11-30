import { motion } from 'framer-motion';

interface RarityEffectsProps {
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

export const RarityEffects = ({ rarity }: RarityEffectsProps) => {
  if (rarity === 'LEGENDARY') {
    return (
      <>
        {/* Golden rays rotating */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 pointer-events-none"
            initial={{ rotate: i * 45 }}
            animate={{ rotate: i * 45 + 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            <div 
              className="absolute top-1/2 left-1/2 w-1 h-full bg-gradient-to-t from-transparent via-yellow-400/40 to-transparent"
              style={{ transformOrigin: '50% 0%' }}
            />
          </motion.div>
        ))}
        
        {/* Floating star particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute text-yellow-400 text-xs"
            initial={{ 
              x: Math.random() * 100 - 50,
              y: Math.random() * 100 - 50,
              opacity: 0,
              scale: 0
            }}
            animate={{ 
              y: [null, -100, -150],
              opacity: [0, 1, 0],
              scale: [0, 1, 0.5]
            }}
            transition={{ 
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              repeatDelay: 1
            }}
            style={{
              left: `${20 + (i * 15)}%`,
              top: '50%'
            }}
          >
            ✦
          </motion.div>
        ))}
        
        {/* Intense golden glow */}
        <motion.div
          className="absolute inset-0 rounded-lg bg-yellow-400/20 blur-xl pointer-events-none"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </>
    );
  }

  if (rarity === 'EPIC') {
    return (
      <>
        {/* Pulsating purple aura */}
        <motion.div
          className="absolute inset-0 rounded-lg bg-purple-500/20 blur-lg pointer-events-none"
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scale: [0.95, 1.05, 0.95]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        
        {/* Energy particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-purple-400 rounded-full blur-sm"
            initial={{ 
              x: 0,
              y: 0,
              opacity: 0
            }}
            animate={{ 
              x: [0, Math.cos(i * Math.PI / 2) * 60],
              y: [0, Math.sin(i * Math.PI / 2) * 60],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 1.5,
              delay: i * 0.2,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
            style={{
              left: '50%',
              top: '50%'
            }}
          />
        ))}
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-300/30 to-transparent pointer-events-none"
          animate={{
            x: ['-100%', '200%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
        />
      </>
    );
  }

  if (rarity === 'RARE') {
    return (
      <>
        {/* Soft blue glow */}
        <motion.div
          className="absolute inset-0 rounded-lg bg-blue-400/15 blur-md pointer-events-none"
          animate={{
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        
        {/* Crystal shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-200/20 to-transparent pointer-events-none"
          animate={{
            rotate: [0, 360]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      </>
    );
  }

  return null;
};
