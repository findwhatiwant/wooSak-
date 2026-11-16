// Quiet, synthesized ambient studies. Playback only begins after a user gesture.
export class AmbientSound {
  context = null;
  active = false;
  async play(variant = 'drift') {
    await this.stop();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('이 브라우저에서는 사운드를 지원하지 않습니다.');
    const context = new AudioContext(); this.context = context;
    await context.resume();
    if (this.context !== context) return;
    const master = context.createGain(); master.gain.setValueAtTime(0, context.currentTime); master.gain.linearRampToValueAtTime(.15, context.currentTime + 2); master.connect(context.destination);
    const base = variant === 'horizon' ? 55 : variant === 'noise' ? 73.416 : 65.406;
    [1, 1.5, 2, 2.998, 4].forEach((ratio, i) => {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = base * ratio; oscillator.detune.value = i % 2 ? -5 : 3;
      gain.gain.value = .28 / (1 + i * .6); oscillator.connect(gain); gain.connect(master);
      const lfo = context.createOscillator(); const depth = context.createGain(); lfo.frequency.value = .035 + i * .018; depth.gain.value = .04; lfo.connect(depth); depth.connect(gain.gain); lfo.start(); oscillator.start();
    });
    this.master = master; this.active = true;
  }
  async stop() { this.active = false; const context = this.context; this.context = null; if (!context || context.state === 'closed') return; await context.close(); }
}
