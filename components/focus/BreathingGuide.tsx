'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function BreathingGuide({ timeLeft }: { timeLeft: number }) {
    const [phase, setPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');

    useEffect(() => {
        const timer = setInterval(() => {
            setPhase((prev) => {
                if (prev === 'inhale') return 'holdIn';
                if (prev === 'holdIn') return 'exhale';
                if (prev === 'exhale') return 'holdOut';
                return 'inhale';
            });
        }, 4000); // 4s for each phase

        return () => clearInterval(timer);
    }, []);

    const text = {
        inhale: 'Breathe In',
        holdIn: 'Hold',
        exhale: 'Breathe Out',
        holdOut: 'Hold'
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="relative flex items-center justify-center w-72 h-72">
                {/* Background pulse */}
                <motion.div
                    animate={{
                        scale: (phase === 'inhale' || phase === 'holdIn') ? 1.5 : 1,
                        opacity: (phase === 'inhale' || phase === 'holdIn') ? 0.3 : 0.1
                    }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="absolute w-44 h-44 rounded-full bg-blue-400/20 blur-xl"
                />
                
                {/* Main Circle */}
                <motion.div
                    animate={{
                        scale: (phase === 'inhale' || phase === 'holdIn') ? 1.5 : 1,
                    }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="w-40 h-40 rounded-full border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center bg-white dark:bg-slate-900 z-10"
                >
                    <div className="flex flex-col items-center">
                        <span className="text-4xl font-mono font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </span>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={phase}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mt-2"
                            >
                                {text[phase]}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Outer Ring */}
                <motion.div
                    animate={{
                        scale: (phase === 'inhale' || phase === 'holdIn') ? 1.4 : 1,
                        rotate: 360
                    }}
                    transition={{ 
                        scale: { duration: 4, ease: "easeInOut" },
                        rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                    }}
                    className="absolute w-52 h-52 rounded-full border-2 border-dashed border-blue-200/40 dark:border-blue-800/30"
                />
            </div>
            <p className="mt-8 text-slate-400 text-[10px] uppercase tracking-[0.3em] font-bold">
                Centering Break
            </p>
        </div>
    );
}
