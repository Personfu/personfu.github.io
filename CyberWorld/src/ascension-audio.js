// Original procedural score and city Foley. All sounds are synthesized locally;
// no samples, network requests, microphones or autoplay permission prompts.
export function createCityAudio() {
  let ctx, master, compressor, reverb, send, rain, servers, pads;
  let enabled = false, lastStep = 0, beat = 0, nextBeat = 0, chord = -1;
  let current = { view: 'plaza', district: null, overclock: false, paused: true };
  let resumeAfterVisibility = false;
  const voices = new Set();
  const harmony = [[38, 53, 57, 64], [34, 53, 57, 62], [31, 50, 57, 62], [33, 52, 59, 62]];
  const motif = [0, 2, 3, 2, 1, 2, 3, 1];
  const hz = note => 440 * 2 ** ((note - 69) / 12);
  const volume = (node, value, time = .6) => node.gain.setTargetAtTime(value, ctx.currentTime, time);

  function noise(seconds, decay = false) {
    const buffer = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    let seed = 0x6c6f6361;
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let brown = 0;
      for (let i = 0; i < samples.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        brown = (brown + ((seed / 4294967296) * 2 - 1) * .06) / 1.025;
        samples[i] = brown * (decay ? (1 - i / samples.length) ** 2 : 1);
      }
    }
    return buffer;
  }

  function track(source, nodes, end) {
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); nodes.forEach(node => node.disconnect()); };
    source.start(); source.stop(end);
  }

  function note(frequency, level, duration = .9, type = 'sine', pan = 0) {
    if (!ctx || voices.size >= 32) return;
    const oscillator = ctx.createOscillator(), envelope = ctx.createGain(), stereo = ctx.createStereoPanner();
    const time = ctx.currentTime;
    oscillator.type = type; oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, level), time + .012);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    stereo.pan.value = pan;
    oscillator.connect(envelope); envelope.connect(stereo); stereo.connect(master); stereo.connect(send);
    track(oscillator, [envelope, stereo], time + duration + .04);
  }

  function step(running, interior) {
    const time = ctx.currentTime, source = ctx.createBufferSource(), band = ctx.createBiquadFilter();
    const gain = ctx.createGain(), pan = ctx.createStereoPanner();
    source.buffer = rain.buffer; band.type = 'bandpass'; band.frequency.value = interior ? 920 : 560;
    band.Q.value = .65; pan.pan.value = beat % 2 ? -.12 : .12;
    gain.gain.setValueAtTime(.13, time); gain.gain.exponentialRampToValueAtTime(.0001, time + .085);
    source.connect(band); band.connect(gain); gain.connect(pan); pan.connect(master);
    track(source, [band, gain, pan], time + .1);
    note(running ? 84 : 68, running ? .12 : .085, .075, 'sine');
  }

  function initialize() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18; compressor.knee.value = 18; compressor.ratio.value = 4;
    master.connect(compressor); compressor.connect(ctx.destination);
    reverb = ctx.createConvolver(); reverb.buffer = noise(1.6, true);
    send = ctx.createGain(); send.gain.value = .16; send.connect(reverb); reverb.connect(master);

    const noiseBuffer = noise(4);
    const rainSource = ctx.createBufferSource(), rainFilter = ctx.createBiquadFilter(), rainGain = ctx.createGain();
    rainSource.buffer = noiseBuffer; rainSource.loop = true; rainFilter.type = 'highpass'; rainFilter.frequency.value = 780;
    rainGain.gain.value = .08; rainSource.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(master); rainSource.start();
    rain = { source: rainSource, gain: rainGain, buffer: noiseBuffer };

    const serverGain = ctx.createGain(); serverGain.gain.value = .015; serverGain.connect(master);
    [55, 110.3].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.frequency.value = frequency; gain.gain.value = index ? .26 : .55;
      oscillator.connect(gain); gain.connect(serverGain); oscillator.start();
    });
    servers = serverGain;
    pads = [0, 1, 2].map(index => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
      oscillator.type = 'sine'; oscillator.frequency.value = hz(harmony[0][index + 1]);
      gain.gain.value = .018; pan.pan.value = (index - 1) * .55;
      oscillator.connect(gain); gain.connect(pan); pan.connect(master); pan.connect(send); oscillator.start();
      return oscillator;
    });
    nextBeat = ctx.currentTime + .1;
    return true;
  }

  function setEnabled(value) {
    enabled = !!value;
    try {
      if (enabled && !ctx && !initialize()) { enabled = false; return false; }
      if (ctx) {
        volume(master, enabled && !document.hidden ? .34 : 0, .07);
        if (enabled && !document.hidden) { nextBeat = ctx.currentTime + .1; ctx.resume().catch(() => {}); }
      }
    } catch (_) { enabled = false; }
    return enabled;
  }

  function update(value = {}) {
    current = value;
    if (!ctx || !enabled) return;
    const hidden = document.hidden || value.hidden;
    if (hidden) { volume(master, 0, .03); return; }
    const interior = value.view === 'district' || !!value.district;
    volume(master, value.paused ? .11 : .34, .3);
    volume(rain.gain, interior && value.district!=='arena' ? .009 : .1, 1.2);
    volume(servers, interior ? .075 : .02, 1.1);
    const time = ctx.currentTime;
    if (value.moving && !value.paused && time - lastStep > (value.running ? .29 : .43)) {
      step(value.running, interior); lastStep = time;
    }
    // Schedule from the audio clock, never catch up a burst after a slow frame.
    if (time < nextBeat) return;
    nextBeat = time + (value.overclock ? .52 : value.combat ? .26 : .357);
    const nextChord = Math.floor(beat / 32) % harmony.length, notes = harmony[nextChord];
    if (nextChord !== chord) {
      chord = nextChord;
      pads.forEach((oscillator, index) => oscillator.frequency.setTargetAtTime(hz(notes[index + 1]), time, .8));
    }
    if (!value.paused) {
      if(value.combat&&beat%2===0)impact('pulse');
      if (beat % 4 === 0) note(hz(notes[0]), interior ? .08 : .065, 1.3);
      if (beat % 2 === 0) note(hz(notes[motif[(beat / 2) % 8]] + 12), value.overclock ? .047 : .023, 1.15, 'sine', Math.sin(beat * .9) * .48);
      if (value.overclock && beat % 4 === 2) note(hz(notes[2] + 24), .018, .65, 'triangle', -.4);
    }
    beat++;
  }

  function cue(frequency = 440) {
    if (!enabled || !ctx || document.hidden) return;
    note(Math.max(80, Math.min(1800, frequency)), .08, .24);
    note(Math.max(80, Math.min(1800, frequency * 1.5)), .026, .45, 'sine', .2);
  }

  function impact(kind='hit') {
    if(!enabled||!ctx||document.hidden||current.paused||voices.size>=28)return false;
    const time=ctx.currentTime,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    const heavy=kind==='burst'||kind==='kill',pulse=kind==='pulse',swoosh=kind==='dodge'||kind==='strike';
    source.buffer=rain.buffer;filter.type=swoosh?'bandpass':'lowpass';filter.frequency.value=swoosh?2300:heavy?1100:620;filter.Q.value=.7;
    const duration=pulse?.075:swoosh?.13:heavy?.28:.14;
    gain.gain.setValueAtTime(pulse?.025:swoosh?.16:heavy?.55:.36,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter);filter.connect(gain);gain.connect(master);track(source,[filter,gain],time+duration+.02);
    if(!swoosh){
      const oscillator=ctx.createOscillator(),bass=ctx.createGain();oscillator.frequency.setValueAtTime(heavy?170:pulse?96:130,time);oscillator.frequency.exponentialRampToValueAtTime(40,time+duration);
      bass.gain.setValueAtTime(pulse?.09:heavy?.32:.21,time);bass.gain.exponentialRampToValueAtTime(.0001,time+duration);
      oscillator.connect(bass);bass.connect(master);track(oscillator,[bass],time+duration+.02);
    }
    return true;
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      resumeAfterVisibility = enabled; ctx.suspend().catch(() => {});
    } else if (resumeAfterVisibility && enabled) {
      nextBeat = ctx.currentTime + .1; ctx.resume().catch(() => {}); resumeAfterVisibility = false;
    }
  });
  window.addEventListener('pagehide', () => { if (ctx) ctx.suspend().catch(() => {}); });
  window.addEventListener('pageshow', () => { if (ctx && enabled && !document.hidden) ctx.resume().catch(() => {}); });
  return { setEnabled, update, cue, impact, snapshot: () => ({ enabled, state: ctx?.state || 'uninitialized', voices: voices.size, mode: current.overclock ? 'overclock' : current.district ? 'interior' : 'city' }) };
}
