export class SoundEngine {
    private ctx: AudioContext | null = null;
    // All voices route here -> compressor -> speakers, so overlapping shots + kill chimes
    // are limited instead of summing past 1.0 and clipping / dropping out.
    private out: AudioNode | null = null;
    // Noise buffers are generated once; regenerating per shot (~8k random samples at
    // 9 shots/s) caused GC hitches and audio-thread underruns that dropped gunshots.
    private shotNoise: AudioBuffer | null = null;
    private slashNoise: AudioBuffer | null = null;

    init(): void {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx: AudioContext = new AudioCtx();
            this.ctx = ctx;

            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -14;
            comp.knee.value = 8;
            comp.ratio.value = 6;
            comp.attack.value = 0.002;
            comp.release.value = 0.12;
            const master = ctx.createGain();
            master.gain.value = 0.8;
            master.connect(comp);
            comp.connect(ctx.destination);
            this.out = master;

            this.shotNoise = this.makeNoise(0.16, i => Math.exp(-i / (ctx.sampleRate * 0.045)));
            this.slashNoise = this.makeNoise(0.18, () => 1);
        }
        if (this.ctx.state !== 'running') {
            this.ctx.resume();
        }
    }

    private makeNoise(seconds: number, envelope: (i: number) => number): AudioBuffer {
        const ctx = this.ctx!;
        const len = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * envelope(i);
        return buf;
    }

    /** Ready check shared by every play* method. */
    private ready(): { ctx: AudioContext; out: AudioNode; now: number } | null {
        this.init();
        if (!this.ctx || !this.out) return null;
        return { ctx: this.ctx, out: this.out, now: this.ctx.currentTime };
    }

    private tone(type: OscillatorType, f0: number, f1: number, start: number, dur: number, vol: number): void {
        const r = this.ready();
        if (!r) return;
        const { ctx, out } = r;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, start);
        osc.frequency.exponentialRampToValueAtTime(f1, start + dur * 0.8);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(out);
        osc.start(start);
        osc.stop(start + dur + 0.02);
    }

    playVandalShot(empressBoost: boolean = false): void {
        const r = this.ready();
        if (!r) return;
        const { ctx, out, now } = r;

        // Punchy low-mid thump
        this.tone('sawtooth', empressBoost ? 210 : 165, 35, now, 0.15, 0.4);

        // High-energy crack noise (shared pre-built buffer)
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = this.shotNoise;
        whiteNoise.playbackRate.value = 0.94 + Math.random() * 0.12; // slight variation per shot
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(0.9, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.45, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(out);
        whiteNoise.start(now);
    }

    /**
     * Valorant-style kill chime: one rising note per kill in the streak (1..5),
     * so a triple kill plays a 3-note arpeggio. 5 = ACE gets a sustained chord on top.
     */
    playKill(streak: number, headshot: boolean): void {
        const r = this.ready();
        if (!r) return;
        const { now } = r;
        const n = Math.max(1, Math.min(streak, 5));

        if (headshot) this.tone('triangle', 1760, 2240, now, 0.18, 0.3); // metallic dink

        // Major pentatonic steps from D5
        const steps = [0, 4, 7, 12, 16];
        for (let i = 0; i < n; i++) {
            const f = 587.33 * Math.pow(2, steps[i] / 12);
            const t = now + 0.04 + i * 0.075;
            this.tone('sine', f, f * 1.02, t, 0.32, 0.28);
            this.tone('triangle', f * 2, f * 2.02, t, 0.2, 0.08); // shimmer octave
        }

        if (n >= 3) {
            // Low "boom" swell for multi-kills
            this.tone('sine', 110, 55, now + 0.02, 0.5, 0.35);
        }
        if (n === 5) {
            const t = now + 0.04 + 5 * 0.075;
            [587.33, 739.99, 880, 1174.66].forEach(f => this.tone('sawtooth', f, f, t, 0.9, 0.06));
        }
    }

    /** Soft low thump; vol 0..1 (scaled by distance for the opponent). */
    playFootstep(vol: number): void {
        const r = this.ready();
        if (!r || vol <= 0.01) return;
        const { ctx, out, now } = r;
        const src = ctx.createBufferSource();
        src.buffer = this.slashNoise;
        src.playbackRate.value = 0.8 + Math.random() * 0.3;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 520;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        src.start(now);
        src.stop(now + 0.1);
    }

    playReloadSound(): void {
        const r = this.ready();
        if (!r) return;
        const { now } = r;
        [0.08, 0.48, 0.85].forEach((offset, idx) => {
            const f = idx === 2 ? 520 : 320 + idx * 90;
            this.tone('square', f, f, now + offset, 0.06, 0.15);
        });
    }

    playKnifeSlash(): void {
        const r = this.ready();
        if (!r) return;
        const { ctx, out, now } = r;
        // Short filtered noise sweep = "swoosh"
        const src = ctx.createBufferSource();
        src.buffer = this.slashNoise;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(1.2, now);
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(4200, now + 0.16);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        src.start(now);
    }

    playAbilitySound(type: string): void {
        const r = this.ready();
        if (!r) return;
        const { now } = r;
        if (type === 'heal') this.tone('sine', 340, 680, now, 0.55, 0.25);
        else if (type === 'ult') this.tone('sawtooth', 140, 520, now, 0.55, 0.25);
        else this.tone('sine', 480, 220, now, 0.55, 0.25);
    }
}

export const sound = new SoundEngine();
