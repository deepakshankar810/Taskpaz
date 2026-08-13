'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BreathingGuideProps {
    timeLeft: number;
    totalSeconds: number;
    label: string;
    isRunning: boolean;
    isBreak?: boolean;
    zenMode?: boolean;
}

function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function BreathingGuide({ timeLeft, totalSeconds, label, isRunning, isBreak = false, zenMode = false }: BreathingGuideProps) {
    const [phase, setPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');

    useEffect(() => {
        if (!isRunning) {
            setPhase('inhale');
            return;
        }
        const timer = setInterval(() => {
            setPhase((prev) => {
                if (prev === 'inhale') return 'holdIn';
                if (prev === 'holdIn') return 'exhale';
                if (prev === 'exhale') return 'holdOut';
                return 'inhale';
            });
        }, 4000);

        return () => clearInterval(timer);
    }, [isRunning]);

    const text: Record<string, string> = {
        inhale: 'Breathe In',
        holdIn: 'Hold',
        exhale: 'Breathe Out',
        holdOut: 'Hold'
    };

    const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
    const isExpanded = phase === 'inhale' || phase === 'holdIn';
    const radius = 140;
    const circumference = 2 * Math.PI * radius;

    // Color scheme based on mode
    const gradientFrom = isBreak ? '#14b8a6' : '#6366f1';
    const gradientTo = isBreak ? '#06b6d4' : '#3b82f6';
    const glowColor = isBreak ? 'rgba(20,184,166,0.5)' : 'rgba(59,130,246,0.5)';
    const softGlowClass = isBreak ? 'bg-teal-400/15' : 'bg-blue-400/15';
    const outerRingClass = isBreak ? 'border-teal-200/30 dark:border-teal-800/20' : 'border-blue-200/30 dark:border-blue-800/20';
    const textAccentClass = isBreak ? 'text-teal-500' : 'text-blue-500';
    const textAccentDimClass = isBreak ? 'text-teal-500/80' : 'text-blue-500/80';

    return (
        <div className="flex flex-col items-center justify-center text-center">
            <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>
                
                {/* Outermost soft glow pulse */}
                <motion.div
                    animate={{
                        scale: isRunning && isExpanded ? 1.25 : 1,
                        opacity: isRunning && isExpanded ? 0.25 : 0.05,
                    }}
                    transition={{ duration: 4, ease: 'easeInOut' }}
                    className={`absolute rounded-full ${softGlowClass} blur-3xl`}
                    style={{ width: 280, height: 280 }}
                />

                {/* Mid glow ring */}
                <motion.div
                    animate={{
                        scale: isRunning && isExpanded ? 1.15 : 1,
                        opacity: isRunning && isExpanded ? 0.35 : 0.08,
                    }}
                    transition={{ duration: 4, ease: 'easeInOut' }}
                    className={`absolute rounded-full ${softGlowClass} blur-2xl`}
                    style={{ width: 240, height: 240 }}
                />

                {/* Rotating dashed outer ring */}
                <motion.div
                    animate={{
                        scale: isRunning && isExpanded ? 1.12 : 1,
                        rotate: 360,
                    }}
                    transition={{
                        scale: { duration: 4, ease: 'easeInOut' },
                        rotate: { duration: 25, repeat: Infinity, ease: 'linear' },
                    }}
                    className={`absolute rounded-full border-2 border-dashed ${outerRingClass}`}
                    style={{ width: 330, height: 330 }}
                />

                {/* Second rotating ring (opposite direction, slower) */}
                <motion.div
                    animate={{
                        scale: isRunning && isExpanded ? 1.08 : 1,
                        rotate: -360,
                    }}
                    transition={{
                        scale: { duration: 4, ease: 'easeInOut' },
                        rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
                    }}
                    className={`absolute rounded-full border border-dashed ${outerRingClass} opacity-40`}
                    style={{ width: 348, height: 348 }}
                />

                {/* Main breathing circle with SVG progress */}
                <motion.div
                    className="relative"
                    animate={{ scale: isRunning ? (isExpanded ? 1.06 : 0.98) : 1 }}
                    transition={{ duration: 4, ease: 'easeInOut' }}
                >
                    <svg width="320" height="320" className="-rotate-90">
                        {/* Background track */}
                        <circle
                            cx="160" cy="160" r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-slate-100 dark:text-slate-800/50"
                        />
                        {/* Animated glow behind progress arc */}
                        <circle
                            cx="160" cy="160" r={radius}
                            stroke={glowColor}
                            strokeWidth="16"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - progress / 100)}
                            style={{ transition: 'stroke-dashoffset 1s linear', filter: 'blur(8px)' }}
                            opacity={0.5}
                        />
                        {/* Progress arc */}
                        <circle
                            cx="160" cy="160" r={radius}
                            stroke="url(#breathGrad)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - progress / 100)}
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                        <defs>
                            <linearGradient id="breathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={gradientFrom} />
                                <stop offset="100%" stopColor={gradientTo} />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {/* Label */}
                        <motion.span
                            className={`text-[11px] font-bold tracking-[0.25em] uppercase mb-2 transition-colors ${zenMode ? textAccentClass : 'text-slate-400'}`}
                            animate={{ opacity: isRunning ? 0.7 : 1 }}
                        >
                            {label}
                        </motion.span>

                        {/* Time display */}
                        <motion.span
                            className={`text-6xl font-mono font-bold tabular-nums tracking-tight transition-colors duration-700 ${
                                isRunning
                                    ? isBreak
                                        ? 'text-teal-600 dark:text-teal-400'
                                        : 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-900 dark:text-white'
                            }`}
                            animate={{
                                scale: isRunning ? (isExpanded ? 1.02 : 0.98) : 1,
                            }}
                            transition={{ duration: 4, ease: 'easeInOut' }}
                        >
                            {formatTime(timeLeft)}
                        </motion.span>

                        {/* Breathing phase text or progress */}
                        {isRunning ? (
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={phase}
                                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.9 }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className={`text-[11px] font-black uppercase tracking-[0.2em] ${textAccentDimClass} mt-2`}
                                >
                                    {text[phase]}
                                </motion.span>
                            </AnimatePresence>
                        ) : (
                            !zenMode && (
                                <span className="text-slate-400 text-xs mt-2 font-medium">
                                    {Math.round(progress)}% complete
                                </span>
                            )
                        )}
                    </div>
                </motion.div>
            </div>
            
            {/* Bottom label */}
            {isRunning && (
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="mt-4 text-slate-400 text-[10px] uppercase tracking-[0.3em] font-bold"
                >
                    {isBreak ? 'Centering Break' : 'Deep Focus'}
                </motion.p>
            )}
        </div>
    );
}
