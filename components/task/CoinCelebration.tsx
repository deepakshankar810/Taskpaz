'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoinCelebrationProps {
  trigger: boolean;
  amount?: number;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function CoinCelebration({ trigger, amount, onComplete }: CoinCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles: Particle[] = Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 350,
        y: -120 - Math.random() * 200,
        scale: 0.7 + Math.random() * 0.6,
        rotation: Math.random() * 720 - 360,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        if (onComplete) onComplete();
      }, 2200);

      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.4, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x: p.x,
              y: p.y,
              scale: p.scale,
              rotate: p.rotation,
            }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="absolute flex items-center justify-center"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 border-2 border-yellow-100 shadow-lg shadow-yellow-500/50 flex items-center justify-center font-bold text-amber-950 text-xs">
              💰
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {amount && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1, 0.9], y: -60 }}
          transition={{ duration: 2.2, times: [0, 0.2, 0.8, 1] }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black px-6 py-3 rounded-2xl shadow-2xl border-2 border-emerald-300 text-lg flex items-center gap-2"
        >
          <span>🎉 Habit Savings Earned:</span>
          <span className="text-yellow-300 tabular-nums">+${amount.toFixed(2)}</span>
        </motion.div>
      )}
    </div>
  );
}
