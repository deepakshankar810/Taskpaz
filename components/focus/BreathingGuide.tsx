'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreathingGuideProps {
  timeLeft: number;
  totalSeconds: number;
  label: string;
  isRunning: boolean;
  isBreak?: boolean;
  zenMode?: boolean;
}

export type BreathingPreset = 'box' | 'relax' | 'calm';

interface PresetConfig {
  id: BreathingPreset;
  name: string;
  durations: { inhale: number; holdIn: number; exhale: number; holdOut: number };
}

const PRESETS: PresetConfig[] = [
  { id: 'box', name: 'Box (4-4-4-4)', durations: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 } },
  { id: 'relax', name: '4-7-8 Relax', durations: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 } },
  { id: 'calm', name: '4-6 Calm', durations: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 } },
];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Web Audio Phase Transition Chime Synthesizer
function playPhaseChime(freq: number = 440) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch (e) {}
}

export function BreathingGuide({
  timeLeft,
  totalSeconds,
  label,
  isRunning,
  isBreak = false,
  zenMode = false,
}: BreathingGuideProps) {
  const [selectedPreset, setSelectedPreset] = useState<BreathingPreset>('box');
  const [phase, setPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const currentPreset = PRESETS.find((p) => p.id === selectedPreset) || PRESETS[0];

  useEffect(() => {
    if (!isRunning) {
      setPhase('inhale');
      return;
    }

    let isSubscribed = true;
    let timeoutId: NodeJS.Timeout;

    const runPhaseSequence = (currentPhase: 'inhale' | 'holdIn' | 'exhale' | 'holdOut') => {
      if (!isSubscribed) return;

      const dur = currentPreset.durations[currentPhase];
      if (dur === 0) {
        // Skip 0s phases
        const next = getNextPhase(currentPhase);
        runPhaseSequence(next);
        return;
      }

      setPhase(currentPhase);

      if (soundEnabled) {
        const freqs = { inhale: 523.25, holdIn: 659.25, exhale: 392.00, holdOut: 329.63 };
        playPhaseChime(freqs[currentPhase]);
      }

      timeoutId = setTimeout(() => {
        const next = getNextPhase(currentPhase);
        runPhaseSequence(next);
      }, dur * 1000);
    };

    const getNextPhase = (p: 'inhale' | 'holdIn' | 'exhale' | 'holdOut') => {
      if (p === 'inhale') return 'holdIn';
      if (p === 'holdIn') return 'exhale';
      if (p === 'exhale') return 'holdOut';
      return 'inhale';
    };

    runPhaseSequence('inhale');

    return () => {
      isSubscribed = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isRunning, selectedPreset, soundEnabled]);

  const text: Record<string, string> = {
    inhale: 'Breathe In',
    holdIn: 'Hold',
    exhale: 'Breathe Out',
    holdOut: 'Hold',
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
  const outerRingClass = isBreak
    ? 'border-teal-200/30 dark:border-teal-800/20'
    : 'border-blue-200/30 dark:border-blue-800/20';
  const textAccentClass = isBreak ? 'text-teal-500' : 'text-blue-500';
  const textAccentDimClass = isBreak ? 'text-teal-500/80' : 'text-blue-500/80';

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Preset Selector & Chime toggle */}
      {!zenMode && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-1 rounded-full border border-slate-200/60 dark:border-slate-800">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                  selectedPreset === p.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`h-7 w-7 rounded-full ${
              soundEnabled ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400'
            }`}
            title={soundEnabled ? 'Phase Chimes: On' : 'Phase Chimes: Off'}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}

      <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>
        {/* Outermost soft glow pulse */}
        <motion.div
          animate={{
            scale: isRunning && isExpanded ? 1.25 : 1,
            opacity: isRunning && isExpanded ? 0.25 : 0.05,
          }}
          transition={{ duration: currentPreset.durations[phase] || 4, ease: 'easeInOut' }}
          className={`absolute rounded-full ${softGlowClass} blur-3xl`}
          style={{ width: 280, height: 280 }}
        />

        {/* Mid glow ring */}
        <motion.div
          animate={{
            scale: isRunning && isExpanded ? 1.15 : 1,
            opacity: isRunning && isExpanded ? 0.35 : 0.08,
          }}
          transition={{ duration: currentPreset.durations[phase] || 4, ease: 'easeInOut' }}
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
            scale: { duration: currentPreset.durations[phase] || 4, ease: 'easeInOut' },
            rotate: { duration: 25, repeat: Infinity, ease: 'linear' },
          }}
          className={`absolute rounded-full border-2 border-dashed ${outerRingClass}`}
          style={{ width: 330, height: 330 }}
        />

        {/* Second rotating ring */}
        <motion.div
          animate={{
            scale: isRunning && isExpanded ? 1.08 : 1,
            rotate: -360,
          }}
          transition={{
            scale: { duration: currentPreset.durations[phase] || 4, ease: 'easeInOut' },
            rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
          }}
          className={`absolute rounded-full border border-dashed ${outerRingClass} opacity-40`}
          style={{ width: 348, height: 348 }}
        />

        {/* Main breathing circle with SVG progress */}
        <motion.div
          className="relative"
          animate={{ scale: isRunning ? (isExpanded ? 1.06 : 0.98) : 1 }}
          transition={{ duration: currentPreset.durations[phase] || 4, ease: 'easeInOut' }}
        >
          <svg width="320" height="320" className="-rotate-90">
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-slate-100 dark:text-slate-800/50"
            />
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke={glowColor}
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              style={{ transition: 'stroke-dashoffset 1s linear', filter: 'blur(8px)' }}
              opacity={0.5}
            />
            <circle
              cx="160"
              cy="160"
              r={radius}
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
            <motion.span
              className={`text-[11px] font-bold tracking-[0.25em] uppercase mb-2 transition-colors ${
                zenMode ? textAccentClass : 'text-slate-400'
              }`}
              animate={{ opacity: isRunning ? 0.7 : 1 }}
            >
              {label}
            </motion.span>

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
              transition={{ duration: currentPreset.durations[phase] || 4, ease: 'easeInOut' }}
            >
              {formatTime(timeLeft)}
            </motion.span>

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
