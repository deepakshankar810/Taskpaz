// Web Audio API Procedural Ambient Sound Engine

export type SoundType = 'rain' | 'ocean' | 'brownNoise' | 'forest' | 'binaural';

interface SoundChannel {
  node: AudioNode;
  gainNode: GainNode;
  stopFunc: () => void;
}

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private channels: Map<SoundType, SoundChannel> = new Map();
  private volumes: Map<SoundType, number> = new Map([
    ['rain', 0],
    ['ocean', 0],
    ['brownNoise', 0],
    ['forest', 0],
    ['binaural', 0],
  ]);

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;
        
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;

        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public setChannelVolume(type: SoundType, volume: number) {
    this.init();
    this.volumes.set(type, volume);

    const channel = this.channels.get(type);

    if (volume > 0) {
      if (!channel) {
        this.startChannel(type);
      } else {
        channel.gainNode.gain.setTargetAtTime(volume, this.ctx!.currentTime, 0.1);
      }
    } else if (channel) {
      channel.gainNode.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
      setTimeout(() => {
        if (this.volumes.get(type) === 0) {
          channel.stopFunc();
          this.channels.delete(type);
        }
      }, 150);
    }
  }

  public getChannelVolume(type: SoundType): number {
    return this.volumes.get(type) || 0;
  }

  private startChannel(type: SoundType) {
    if (!this.ctx || !this.masterGain) return;

    const gainNode = this.ctx.createGain();
    const vol = this.volumes.get(type) || 0;
    gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    gainNode.connect(this.masterGain);

    let stopFunc = () => {};

    switch (type) {
      case 'rain':
        stopFunc = this.createRain(gainNode);
        break;
      case 'ocean':
        stopFunc = this.createOcean(gainNode);
        break;
      case 'brownNoise':
        stopFunc = this.createBrownNoise(gainNode);
        break;
      case 'forest':
        stopFunc = this.createForestWind(gainNode);
        break;
      case 'binaural':
        stopFunc = this.createBinauralBeats(gainNode);
        break;
    }

    this.channels.set(type, { node: gainNode, gainNode, stopFunc });
  }

  // --- Rain Generator (Filtered Pink Noise with Patter Modulation) ---
  private createRain(output: GainNode): () => void {
    if (!this.ctx) return () => {};
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const outputData = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      outputData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      outputData[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    whiteNoise.connect(filter);
    filter.connect(output);
    whiteNoise.start();

    return () => {
      try { whiteNoise.stop(); } catch (e) {}
    };
  }

  // --- Ocean Waves (Brown Noise modulated with slow LFO) ---
  private createOcean(output: GainNode): () => void {
    if (!this.ctx) return () => {};
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const waveFilter = this.ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.value = 400;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.12; // wave frequency ~8.3 seconds per wave cycle

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300;

    lfo.connect(lfoGain);
    lfoGain.connect(waveFilter.frequency);

    source.connect(waveFilter);
    waveFilter.connect(output);

    source.start();
    lfo.start();

    return () => {
      try {
        source.stop();
        lfo.stop();
      } catch (e) {}
    };
  }

  // --- Brown Noise (Deep focus rumble) ---
  private createBrownNoise(output: GainNode): () => void {
    if (!this.ctx) return () => {};
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 2.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    source.connect(filter);
    filter.connect(output);
    source.start();

    return () => {
      try { source.stop(); } catch (e) {}
    };
  }

  // --- Forest Wind (Whistling bandpass noise) ---
  private createForestWind(output: GainNode): () => void {
    if (!this.ctx) return () => {};
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 3.0;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.2; // wind gusts
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 250;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(output);

    source.start();
    lfo.start();

    return () => {
      try {
        source.stop();
        lfo.stop();
      } catch (e) {}
    };
  }

  // --- Binaural Beats (Theta Waves: 200 Hz Left, 206 Hz Right = 6 Hz Theta Focus) ---
  private createBinauralBeats(output: GainNode): () => void {
    if (!this.ctx) return () => {};

    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();

    oscLeft.frequency.value = 200; // Base carrier tone
    oscRight.frequency.value = 206; // +6Hz Theta Beat

    const panLeft = this.ctx.createGain();
    const panRight = this.ctx.createGain();

    const merger = this.ctx.createChannelMerger(2);

    oscLeft.connect(merger, 0, 0);  // Left channel
    oscRight.connect(merger, 0, 1); // Right channel

    merger.connect(output);

    oscLeft.start();
    oscRight.start();

    return () => {
      try {
        oscLeft.stop();
        oscRight.stop();
      } catch (e) {}
    };
  }

  public stopAll() {
    this.channels.forEach((ch, type) => {
      ch.stopFunc();
      this.volumes.set(type, 0);
    });
    this.channels.clear();
  }
}

export const ambientEngine = new AmbientSoundEngine();
