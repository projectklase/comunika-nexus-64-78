import { motion } from 'framer-motion';

interface CardPlayEffectProps {
  cardId: string;
}

export const CardPlayEffect = ({ cardId }: CardPlayEffectProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="text-6xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: 'spring', duration: 0.6 }}
      >
        ✨
      </motion.div>
    </motion.div>
  );
};
