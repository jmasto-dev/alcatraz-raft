#!/bin/sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/devuser/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"

"$LIB/.venv/bin/python" core/audio/sampler.py --need "$HERE/mix.py"
"$LIB/.venv/bin/python" core/tts/tts.py "$HERE/lines_en.json" "$HERE/voice/"
"$LIB/.venv/bin/python" core/tts/asr_check.py "$HERE/lines_en.json" "$HERE/voice/" --lang en

node core/render/events.mjs "$HERE"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 30 --workers 3 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/alcatraz-raft.mp4" 30 6

node -e "
const fs = require('fs');
const durs = JSON.parse(fs.readFileSync('$HERE/voice/dur.json', 'utf8'));
const lines = JSON.parse(fs.readFileSync('$HERE/lines_en.json', 'utf8'));
const cues = lines.map(l => ({ t0: l.t, t1: +(l.t + durs[l.id] + 0.35).toFixed(3), text: l.text }));
fs.writeFileSync('$HERE/out/cues.json', JSON.stringify(cues, null, 2));
"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_en.srt"
node core/render/readcheck.mjs "$HERE"
node core/render/still.mjs "$HERE" 26.5
cp "$HERE/stills/t_26.5.jpg" "$HERE/poster.jpg"
