/**
 * Procedural Web Audio API Sound Engine for Nono City Life
 * 100% self-contained, zero external asset dependencies.
 */

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Engine sound generator
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

  // Siren generator
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenActive: boolean = false;

  // Tire screech generator
  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;

  // Radio generator
  private radioInterval: number | null = null;
  private currentRadioStation: number = 0; // 0: Off, 1: Nono Beats, 2: Electro City, 3: Synthwave
  private radioStep: number = 0;

  private isMuted: boolean = false;
  private sfxVol: number = 0.8;
  private musicVol: number = 0.5;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);
  }

  public setVolumes(sfx: number, music: number) {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : sfx, this.ctx.currentTime);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : music, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // === FOOTSTEPS ===
  public playFootstep() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // === WEAPON GUNSHOTS & COMBAT ===
  public playShoot(weapon: string) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (weapon === 'fists') {
      // Punch swoosh + impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(now + 0.13);
      return;
    }

    // Gunshot noise burst
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    let duration = 0.2;
    let baseGain = 0.35;

    if (weapon === 'pistol') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.35, now);
      duration = 0.18;
    } else if (weapon === 'smg') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      gain.gain.setValueAtTime(0.28, now);
      duration = 0.14;
    } else if (weapon === 'rifle') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      gain.gain.setValueAtTime(0.4, now);
      duration = 0.25;
    } else if (weapon === 'shotgun') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.5, now);
      duration = 0.35;
    } else {
      // Sniper
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, now);
      gain.gain.setValueAtTime(0.55, now);
      duration = 0.45;
    }

    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Punchy sub-bass thump for weapon punch
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(180, now);
    thump.frequency.exponentialRampToValueAtTime(35, now + duration * 0.7);
    thumpGain.gain.setValueAtTime(baseGain * 0.8, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    thump.connect(thumpGain);
    thumpGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + duration);
    thump.start(now);
    thump.stop(now + duration);
  }

  public playReload() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Metallic click-clack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1400, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playHitImpact() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // === VEHICLE ENGINE SOUND ===
  public startVehicleEngine() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isEngineRunning) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // idle RPM

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc.start();
      this.isEngineRunning = true;
    } catch {
      // Audio not permitted yet
    }
  }

  public updateVehicleEngine(speedRatio: number, throttle: boolean, nitro: boolean = false) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc || !this.engineFilter || !this.engineGain) return;

    const baseFreq = 50 + speedRatio * 180 + (nitro ? 80 : 0);
    const filterFreq = 300 + speedRatio * 1200 + (throttle ? 300 : 0) + (nitro ? 600 : 0);
    const volume = 0.12 + (throttle ? 0.08 : 0) + (nitro ? 0.06 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(volume, now, 0.08);
  }

  public stopVehicleEngine() {
    if (this.engineOsc && this.ctx) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {
        // Ignored
      }
      this.engineOsc = null;
    }
    this.isEngineRunning = false;
  }

  // === HORN ===
  public playHorn() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.setValueAtTime(554.37, now); // C#5 (harmonious dual horn)

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);
  }

  // === TIRE SCREECH / DRIFT ===
  public setDriftScreech(active: boolean) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    if (active) {
      if (!this.screechGain) {
        // Generate noise
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        this.screechFilter = this.ctx.createBiquadFilter();
        this.screechFilter.type = 'bandpass';
        this.screechFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
        this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

        this.screechGain = this.ctx.createGain();
        this.screechGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

        noise.connect(this.screechFilter);
        this.screechFilter.connect(this.screechGain);
        this.screechGain.connect(this.sfxGain);

        noise.start();
      }
    } else {
      if (this.screechGain && this.ctx) {
        this.screechGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          this.screechGain?.disconnect();
          this.screechGain = null;
        }, 100);
      }
    }
  }

  // === POLICE SIREN ===
  public setSiren(active: boolean) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    if (active && !this.isSirenActive) {
      this.isSirenActive = true;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sawtooth';

      // Modulator for siren wail
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(1.2, this.ctx.currentTime); // cycle speed

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(280, this.ctx.currentTime); // pitch excursion

      this.sirenOsc.frequency.setValueAtTime(750, this.ctx.currentTime);
      lfo.connect(this.sirenOsc.frequency);

      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.sfxGain);

      lfo.start();
      this.sirenOsc.start();
    } else if (!active && this.isSirenActive) {
      this.isSirenActive = false;
      if (this.sirenOsc) {
        try {
          this.sirenOsc.stop();
          this.sirenOsc.disconnect();
        } catch {}
        this.sirenOsc = null;
      }
    }
  }

  // === UI SOUNDS ===
  public playCashRegister() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.1); // E6
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playMissionFanfare(success: boolean) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const notes = success ? [523.25, 659.25, 783.99, 1046.50] : [440, 392, 349, 293.66]; // C-E-G-C or sad descending
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = success ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.4);
    });
  }

  // === PROCEDURAL RADIO STATIONS ===
  public setRadioStation(station: number) {
    this.currentRadioStation = station;
    if (this.radioInterval) {
      window.clearInterval(this.radioInterval);
      this.radioInterval = null;
    }

    if (station === 0) return; // Off

    this.initContext();
    this.radioStep = 0;

    // 120 BPM step sequencer (125ms per 16th note)
    this.radioInterval = window.setInterval(() => {
      this.playRadioStep();
      this.radioStep = (this.radioStep + 1) % 16;
    }, 125);
  }

  public getRadioStation(): number {
    return this.currentRadioStation;
  }

  private playRadioStep() {
    if (!this.ctx || !this.musicGain || this.isMuted || this.currentRadioStation === 0) return;
    const now = this.ctx.currentTime;

    if (this.currentRadioStation === 1) {
      // Station 1: Nono Beats (Lo-fi / Hip-Hop groove)
      // Kick on 0, 8; Snare on 4, 12; Bassline notes
      if (this.radioStep === 0 || this.radioStep === 8 || this.radioStep === 10) {
        this.synthesizeDrum('kick', now);
      }
      if (this.radioStep === 4 || this.radioStep === 12) {
        this.synthesizeDrum('snare', now);
      }
      if (this.radioStep % 2 === 0) {
        this.synthesizeDrum('hihat', now);
      }
      // Bassline note
      const bassNotes = [110, 110, 130.81, 98, 110, 110, 146.83, 130.81];
      const note = bassNotes[Math.floor(this.radioStep / 2) % bassNotes.length];
      if (this.radioStep % 2 === 0) {
        this.synthesizeSynthNote(note, 0.18, 'triangle', 0.15, now);
      }
    } else if (this.currentRadioStation === 2) {
      // Station 2: Electro City (Fast Synthwave 140bpm feel)
      if (this.radioStep % 4 === 0) {
        this.synthesizeDrum('kick', now);
      }
      if (this.radioStep % 8 === 4) {
        this.synthesizeDrum('snare', now);
      }
      this.synthesizeDrum('hihat', now);
      // Arpeggio
      const arp = [220, 261.63, 329.63, 440, 329.63, 261.63, 220, 164.81];
      const freq = arp[this.radioStep % arp.length];
      this.synthesizeSynthNote(freq, 0.1, 'sawtooth', 0.12, now);
    } else if (this.currentRadioStation === 3) {
      // Station 3: Sunset Boulevard (Chilled Melodic synth)
      if (this.radioStep % 4 === 0) {
        this.synthesizeDrum('kick', now);
      }
      if (this.radioStep === 4 || this.radioStep === 12) {
        this.synthesizeDrum('snare', now);
      }
      if (this.radioStep % 4 === 0) {
        const chordNotes = [261.63, 329.63, 392.00]; // C Major
        chordNotes.forEach(f => this.synthesizeSynthNote(f, 0.4, 'sine', 0.08, now));
      }
    }
  }

  private synthesizeDrum(type: 'kick' | 'snare' | 'hihat', time: number) {
    if (!this.ctx || !this.musicGain) return;

    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.1);
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.12);
    } else if (type === 'snare') {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.09);
    } else if (type === 'hihat') {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.035);
    }
  }

  private synthesizeSynthNote(freq: number, dur: number, type: OscillatorType, vol: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  public dispose() {
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    this.stopVehicleEngine();
    this.setSiren(false);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
