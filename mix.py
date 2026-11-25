"""Score, foley, ambience, and voiceover mix for Fifty Raincoats (48 s, 48 kHz stereo)."""
import os, sys, json
import numpy as np
import soundfile as sf
import soxr
from scipy.signal import butter, sosfilt

LIB = os.environ.get('LIB', '/home/devuser/lemo-opuscar')
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, bp, lp, hp, brown, noise, env_exp, norm, t_

HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 48.0
N = int(round(DUR * SR))

def duck_env(vo_spans, fade=0.22, floor=0.14):
    """Smooth ducking envelope: 1.0 outside speech, `floor` during speech."""
    env = np.ones(N, dtype=np.float32)
    f_samp = int(fade * SR)
    for t0, t1 in vo_spans:
        i0 = max(0, int(t0 * SR) - f_samp)
        i1 = min(N, int(t1 * SR) + f_samp)
        a0 = max(0, int(t0 * SR))
        a1 = min(N, int(t1 * SR))
        if a0 > i0:
            env[i0:a0] = np.minimum(env[i0:a0], np.linspace(1.0, floor, a0 - i0))
        env[a0:a1] = np.minimum(env[a0:a1], floor)
        if i1 > a1:
            env[a1:i1] = np.minimum(env[a1:i1], np.linspace(floor, 1.0, i1 - a1))
    return env

def synth_knife_carve(dur=0.75):
    """Crisp knife-through-scratchboard scrape."""
    x = bp(noise(dur), 1400, 4800) * (1.0 - np.linspace(0, 0.7, int(round(dur * SR))))
    x += bp(noise(dur), 320, 750) * env_exp(dur, 0.28) * 0.45
    return norm(x) * 0.55

def synth_bellows_wheeze(dur=0.65):
    """Concertina bellows air compression & reed breath."""
    tt = t_(dur)
    air = bp(noise(dur), 600, 2600) * np.sin(np.pi * tt / dur) ** 0.7
    reed = (np.sin(2 * np.pi * 146.8 * tt) * 0.35 + np.sin(2 * np.pi * 220.0 * tt) * 0.25) * np.sin(np.pi * tt / dur)
    return norm(air * 0.8 + reed * 0.35) * 0.42

def synth_paddle_splash(dur=0.55):
    """Wooden paddle dipping into bay water."""
    tt = t_(dur)
    thump = np.sin(2 * np.pi * 115 * tt) * env_exp(dur, 0.04) * 0.5
    splash = bp(noise(dur), 450, 3200) * env_exp(dur, 0.14)
    return norm(thump + splash) * 0.48

def synth_steam_burst(dur=1.25):
    """Hot prison steam pipe hiss & whiteout burst."""
    tt = t_(dur)
    env = np.sin(np.pi * tt / dur) ** 0.6
    return norm(bp(noise(dur), 1200, 6500) * env) * 0.58

def build_score():
    """90 BPM chamber score: cellos_pizz, vibraphone_bowed, horn, cellos, timpani, woodblock."""
    BEAT = 60.0 / 90.0  # 0.6667 s
    ev = []
    # Section A: The Rock (0.0 - 8.0 s)
    ev.append((0.0, 'vibraphone_bowed', 'D4', 4.5, 0.50, -0.25))
    ev.append((0.0, 'cellos_pizz', 'D2', 0.8, 0.65, 0.15))
    ev.append((2.667, 'cellos_pizz', 'A2', 0.8, 0.55, 0.15))
    ev.append((5.333, 'cellos_pizz', 'D2', 0.8, 0.60, 0.15))
    ev.append((5.333, 'vibraphone_bowed', 'F4', 2.5, 0.45, -0.25))

    # Section B: Workshop & Steam Pipes (8.0 - 20.67 s) -> Silence at 20.67 s
    for b in range(12, 31):
        t = b * BEAT
        if b % 2 == 0:
            ev.append((t, 'cellos_pizz', 'D2' if b % 4 == 0 else 'F2', 0.5, 0.62, 0.1))
        ev.append((t, 'woodblock', 'a' if b % 2 == 0 else 'b', None, 0.48, -0.3))
        if b % 2 == 1:
            ev.append((t + BEAT * 0.5, 'woodblock', 'c', None, 0.32, 0.25))
    ev.append((13.333, 'horn', 'D3', 4.0, 0.42, 0.2))

    # Silence 1: 20.67 - 23.33 s (no music, only steam hiss & burst)

    # Section C: Concertina Bellows (23.33 - 31.33 s) -> Silence at 31.33 s
    for pt in [25.0, 26.5, 28.0, 29.5]:
        ev.append((pt, 'horn', 'A2', 1.1, 0.58, -0.15))
        ev.append((pt, 'vibraphone_bowed', 'E4', 1.2, 0.42, 0.25))

    # Silence 2: 31.33 - 32.0 s, then Launch Stroke at 32.0 s
    ev.append((32.0, 'timpani', 'D2', 2.2, 0.85, 0.0))

    # Section D: The Bay & Vanishing (32.0 - 44.0 s, fades to wind/water by 44.0 s)
    ev.append((32.0, 'cellos', 'D2', 7.5, 0.55, -0.2))
    ev.append((32.667, 'horn', 'D3', 4.5, 0.52, 0.2))
    ev.append((37.333, 'horn', 'C3', 4.0, 0.44, 0.2))
    ev.append((40.0, 'vibraphone_bowed', 'A4', 3.8, 0.36, -0.25))

    S.seed(1962)
    score = S.render(ev, dur=DUR, master=False)
    score = S.room(score, size=0.45, mix=0.18)
    return score

def main():
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)

    # 1. Load voiceover & measure spans for ducking
    with open(os.path.join(HERE, 'lines_en.json'), encoding='utf-8') as f:
        lines = json.load(f)
    vo_buf = np.zeros((N, 2), dtype=np.float32)
    vo_spans = []
    for L in lines:
        w, sr = sf.read(os.path.join(HERE, 'voice', f"{L['id']}.wav"), dtype='float32')
        if w.ndim > 1:
            w = w.mean(axis=1)
        if sr != SR:
            w = soxr.resample(w, sr, SR)
        # Gentle peak compression on TTS
        w = np.tanh(w * 1.4) / 1.4
        w = norm(w) * 0.72
        add(vo_buf, w, L['t'], gain=1.0, pan=0.0)
        vo_spans.append((L['t'], L['t'] + len(w) / SR))

    # 2. Score (ducked -17 dB under voice)
    score = build_score()
    music_duck = duck_env(vo_spans, fade=0.25, floor=0.14)
    score *= music_duck[:, None] * 0.42

    # 3. Ambience & Foley (ducked -7 dB under voice, print sounds stay strong)
    amb = np.zeros((N, 2), dtype=np.float32)
    # Bay wind + swell bed throughout
    wind = lp(brown(DUR), 420) * 0.16
    swell = lp(noise(DUR), 260) * (0.06 + 0.05 * np.sin(2 * np.pi * 0.18 * t_(DUR)))
    add(amb, wind + swell, 0.0, gain=1.0, pan=0.0)
    # Workshop steam pipe hiss (15.0 .. 23.4 s)
    hiss_d = 8.4
    hiss = bp(noise(hiss_d), 1500, 5200) * np.linspace(0.05, 0.35, int(round(hiss_d * SR)))
    add(amb, hiss, 15.0, gain=0.45, pan=-0.1)

    foley = np.zeros((N, 2), dtype=np.float32)
    with open(os.path.join(HERE, 'events.json'), encoding='utf-8') as f:
        events = json.load(f)['ev']

    for e in events:
        et, ty = e['t'], e['type']
        if ty in ('carve_title', 'carve_date'):
            add(foley, synth_knife_carve(0.8), et, gain=0.85, pan=0.0)
        elif ty == 'vent_whoosh':
            w = bp(noise(0.5), 240, 1200) * np.sin(np.pi * t_(0.5) / 0.5)
            add(foley, norm(w) * 0.35, et, gain=0.6, pan=0.15)
        elif ty == 'shears_snip':
            s = bp(noise(0.12), 2200, 6000) * env_exp(0.12, 0.025)
            add(foley, norm(s) * 0.45, et, gain=0.65, pan=-0.2)
        elif ty == 'clamp_clack':
            c = bp(noise(0.16), 700, 2800) * env_exp(0.16, 0.03)
            add(foley, norm(c) * 0.5, et, gain=0.75, pan=0.1)
        elif ty == 'steam_burst':
            add(foley, synth_steam_burst(1.25), et, gain=0.95, pan=0.0)
        elif ty == 'bellows_pump':
            add(foley, synth_bellows_wheeze(0.65), et, gain=0.75, pan=0.15)
        elif ty == 'valve_click':
            vc = bp(noise(0.08), 1800, 5000) * env_exp(0.08, 0.015)
            add(foley, norm(vc) * 0.5, et, gain=0.85, pan=0.0)
        elif ty == 'raft_splash':
            add(foley, synth_paddle_splash(0.8), et, gain=0.9, pan=0.0)
        elif ty == 'paddle_stroke':
            add(foley, synth_paddle_splash(0.55), et, gain=0.7, pan=-0.25 if int(et) % 2 else 0.25)

    foley_duck = duck_env(vo_spans, fade=0.18, floor=0.45)
    world_sfx = (amb + foley) * foley_duck[:, None]

    # 4. Sum & soft-limit
    mix = score + world_sfx + vo_buf
    peak = np.abs(mix).max()
    if peak > 0.92:
        mix *= 0.92 / peak

    out_wav = os.path.join(HERE, 'out', 'mix.wav')
    sf.write(out_wav, mix, SR, subtype='PCM_16')
    print(f'wrote {out_wav} ({DUR}s, peak={np.abs(mix).max():.3f})')

if __name__ == '__main__':
    main()
