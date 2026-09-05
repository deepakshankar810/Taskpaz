'use client';

import React, { useEffect, useRef } from 'react';
import { ambientEngine } from '@/lib/ambientSoundEngine';

interface AudioWaveformCanvasProps {
  isActive: boolean;
  color?: string;
  height?: number;
}

export function AudioWaveformCanvas({ isActive, color = '#3b82f6', height = 60 }: AudioWaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const analyser = ambientEngine.getAnalyser();
      const bufferLength = analyser ? analyser.frequencyBinCount : 32;
      const dataArray = new Uint8Array(bufferLength);

      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;

      // Glow effect
      ctx.shadowBlur = isActive ? 12 : 0;
      ctx.shadowColor = color;

      ctx.moveTo(0, centerY);

      const points = 60;
      const step = width / points;

      for (let i = 0; i <= points; i++) {
        const x = i * step;
        const freqIndex = Math.floor((i / points) * bufferLength);
        const amp = isActive ? (dataArray[freqIndex] || 15) / 255.0 : 0.05;
        
        // Sine wave superposition + audio frequency data
        const y = centerY + Math.sin(phase + i * 0.15) * (amp * (h / 2.2)) + Math.sin(phase * 1.5 + i * 0.3) * (amp * 8);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();

      phase += isActive ? 0.08 : 0.02;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, color]);

  return (
    <div className="w-full relative overflow-hidden rounded-xl bg-slate-900/10 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 p-2">
      <canvas
        ref={canvasRef}
        width={350}
        height={height}
        className="w-full h-auto block"
      />
    </div>
  );
}
