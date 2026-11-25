// Single source of truth for timing, narration cues, musical sections, and foley hits.
// Tempo: 90 BPM (0.6667 s per beat, 2.6667 s per 4/4 bar). 18 bars = 48.0 s.
export const BPM = 90;
export const BEAT = 60 / BPM; // 0.666667 s

export const T = {
  DUR: 48.0,
  FPS: 30,

  // Key narrative & transition moments
  TITLE_IN: 0.3,
  TITLE_OUT: 5.5,
  VENT_PASS: 8.2,       // camera passes through upper workshop vent bars
  PIPE_HOLD: 15.5,      // track along steam pipes & vulcanizing clamp
  SILENCE_1: 20.67,     // music drops out before steam burst
  STEAM_IN: 22.8,       // steam whiteout begins
  STEAM_PEAK: 23.3,     // < 0.45 s full paper whiteout (workshop -> seawall)
  STEAM_OUT: 23.8,      // emerge at seawall with raft & concertina bellows
  PUMP_STROKES: [25.0, 26.5, 28.0, 29.5], // 4 concertina bellows compressions
  SILENCE_2: 31.33,     // bellows stops, valve clicks shut
  VALVE_CLICK: 31.5,
  LAUNCH_STROKE: 32.0,  // heavy low stroke as raft hits bay water
  PADDLES: [33.5, 35.5, 37.5, 39.5], // wooden paddle strokes
  RISE_START: 40.5,     // camera rises & pulls back
  END_DATE_IN: 43.2,    // JUNE 11, 1962 carved into sky plate
};

export const SECS = [
  { id: 'rock',     t: 0.0,   bpm: 90, beats: 12 }, // 0.0 - 8.0 s
  { id: 'workshop', t: 8.0,   bpm: 90, beats: 19 }, // 8.0 - 20.67 s
  { id: 'steam',    t: 20.67, bpm: 90, beats: 4  }, // 20.67 - 23.33 s (silence -> burst)
  { id: 'bellows',  t: 23.33, bpm: 90, beats: 12 }, // 23.33 - 31.33 s
  { id: 'launch',   t: 31.33, bpm: 90, beats: 1  }, // 31.33 - 32.0 s (silence -> low stroke)
  { id: 'bay',      t: 32.0,  bpm: 90, beats: 24 }, // 32.0 - 48.0 s
];

// Spoken narration cues (start times; durations come from TTS)
export const VO = [
  { id: 'l1', t: 1.2,  text: 'June 1962. High above Alcatraz’s cellblock, three inmates engineered an escape out of raincoats.' },
  { id: 'l2', t: 9.2,  text: 'Over months, they stole more than fifty rubberized coats, cutting and stitching them into a six-by-fourteen-foot hull.' },
  { id: 'l3', t: 16.0, text: 'To seal the seams watertight, they clamped the rubber against hot prison steam pipes, vulcanizing the joints.' },
  { id: 'l4', t: 24.4, text: 'For inflation, they converted a musical concertina into a hand-pumped bellows, driving air through a single red valve.' },
  { id: 'l5', t: 32.8, text: 'On the night of June eleventh, with hand-carved wooden paddles, they pushed off into San Francisco Bay.' },
  { id: 'l6', t: 40.2, text: 'The raft held. By morning, only the tide remained.' },
];
