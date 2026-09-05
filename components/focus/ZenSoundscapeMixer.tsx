'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CloudRain, Waves, Radio, Trees, Brain, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { ambientEngine, SoundType } from '@/lib/ambientSoundEngine';
import { AudioWaveformCanvas } from '@/components/focus/AudioWaveformCanvas';

const SOUND_PRESETS = [
  {
    id: 'deep_focus',
    name: 'Deep Focus',
    icon: Brain,
    description: 'Brown noise + Theta waves for intense concentration',
    mix: { brownNoise: 0.7, binaural: 0.5, rain: 0, ocean: 0, forest: 0 }
  },
  {
    id: 'ocean_rain',
    name: 'Ocean Rain',
    icon: Waves,
    description: 'Calming rainfall & rolling ocean waves',
    mix: { rain: 0.6, ocean: 0.5, brownNoise: 0, forest: 0, binaural: 0 }
  },
  {
    id: 'zen_sanctuary',
    name: 'Zen Sanctuary',
    icon: Trees,
    description: 'Gentle forest breeze & binaural frequency',
    mix: { forest: 0.6, binaural: 0.4, rain: 0.2, ocean: 0, brownNoise: 0 }
  }
];

export function ZenSoundscapeMixer() {
  const [volumes, setVolumes] = useState<Record<SoundType, number>>({
    rain: 0,
    ocean: 0,
    brownNoise: 0,
    forest: 0,
    binaural: 0,
  });

  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen_soundscape_volumes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setVolumes(parsed);
          Object.entries(parsed).forEach(([key, vol]) => {
            ambientEngine.setChannelVolume(key as SoundType, vol as number);
          });
        } catch (e) {}
      }
    }
  }, []);

  const handleVolumeChange = (type: SoundType, val: number) => {
    setActivePreset(null);
    const newVols = { ...volumes, [type]: val };
    setVolumes(newVols);
    ambientEngine.setChannelVolume(type, val);

    if (typeof window !== 'undefined') {
      localStorage.setItem('zen_soundscape_volumes', JSON.stringify(newVols));
    }
  };

  const applyPreset = (preset: typeof SOUND_PRESETS[0]) => {
    setActivePreset(preset.id);
    const newVols: Record<SoundType, number> = {
      rain: preset.mix.rain || 0,
      ocean: preset.mix.ocean || 0,
      brownNoise: preset.mix.brownNoise || 0,
      forest: preset.mix.forest || 0,
      binaural: preset.mix.binaural || 0,
    };
    setVolumes(newVols);
    Object.entries(newVols).forEach(([key, vol]) => {
      ambientEngine.setChannelVolume(key as SoundType, vol);
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('zen_soundscape_volumes', JSON.stringify(newVols));
    }
  };

  const stopAll = () => {
    setActivePreset(null);
    ambientEngine.stopAll();
    const muted = { rain: 0, ocean: 0, brownNoise: 0, forest: 0, binaural: 0 };
    setVolumes(muted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zen_soundscape_volumes', JSON.stringify(muted));
    }
  };

  const isAnyPlaying = Object.values(volumes).some((v) => v > 0);

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
            Zen Soundscapes & Ambient Engine
          </CardTitle>

          {isAnyPlaying && (
            <Button
              variant="ghost"
              size="sm"
              onClick={stopAll}
              className="h-8 text-xs text-slate-500 hover:text-red-500 gap-1"
            >
              <VolumeX className="h-3.5 w-3.5" />
              Mute All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Waveform Visualizer */}
        <AudioWaveformCanvas isActive={isAnyPlaying} color="#6366f1" height={50} />

        {/* Quick Soundscape Presets */}
        <div className="grid grid-cols-3 gap-2">
          {SOUND_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
                    : 'border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="font-semibold text-[11px] truncate">{preset.name}</span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-tight line-clamp-2">{preset.description}</p>
              </button>
            );
          })}
        </div>

        {/* Volume Mixer Controls */}
        <div className="space-y-3 pt-2">
          {/* Rain */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 w-28 text-slate-600 dark:text-slate-300 font-medium">
              <CloudRain className="h-4 w-4 text-blue-500" />
              <span>Rain Patter</span>
            </div>
            <Slider
              value={[volumes.rain]}
              max={1}
              step={0.01}
              onValueChange={([val]) => handleVolumeChange('rain', val)}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">
              {Math.round(volumes.rain * 100)}%
            </span>
          </div>

          {/* Ocean */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 w-28 text-slate-600 dark:text-slate-300 font-medium">
              <Waves className="h-4 w-4 text-cyan-500" />
              <span>Ocean Waves</span>
            </div>
            <Slider
              value={[volumes.ocean]}
              max={1}
              step={0.01}
              onValueChange={([val]) => handleVolumeChange('ocean', val)}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">
              {Math.round(volumes.ocean * 100)}%
            </span>
          </div>

          {/* Brown Noise */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 w-28 text-slate-600 dark:text-slate-300 font-medium">
              <Radio className="h-4 w-4 text-amber-500" />
              <span>Deep Space</span>
            </div>
            <Slider
              value={[volumes.brownNoise]}
              max={1}
              step={0.01}
              onValueChange={([val]) => handleVolumeChange('brownNoise', val)}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">
              {Math.round(volumes.brownNoise * 100)}%
            </span>
          </div>

          {/* Forest Wind */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 w-28 text-slate-600 dark:text-slate-300 font-medium">
              <Trees className="h-4 w-4 text-emerald-500" />
              <span>Forest Wind</span>
            </div>
            <Slider
              value={[volumes.forest]}
              max={1}
              step={0.01}
              onValueChange={([val]) => handleVolumeChange('forest', val)}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">
              {Math.round(volumes.forest * 100)}%
            </span>
          </div>

          {/* Theta Binaural Beats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 w-28 text-slate-600 dark:text-slate-300 font-medium">
              <Brain className="h-4 w-4 text-purple-500" />
              <span>Theta 6Hz</span>
            </div>
            <Slider
              value={[volumes.binaural]}
              max={1}
              step={0.01}
              onValueChange={([val]) => handleVolumeChange('binaural', val)}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">
              {Math.round(volumes.binaural * 100)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
