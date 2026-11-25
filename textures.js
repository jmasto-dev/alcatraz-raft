// Canvas-drawn sprites and plates for Fifty Raincoats. Ink, paper, one red, warm yellow light.
import { mulberry } from '/core/lib.js';

export const INK = '#16171b', PAPER = '#ede5cd', RED = '#c4332b', YELLOW = '#dfa443';

// A short knife cut: blunt entry, tapered exit, a little wobble.
export function cut(g, x0, y0, x1, y1, w, R, col, taper = .85) {
  const n = 8, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, wob = (R() - .5) * len * .04;
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i <= n; i++) {
    const s = i / n, ww = w * (1 - s * taper) * .5, b = Math.sin(s * Math.PI) * wob;
    g.lineTo(x0 + dx * s + nx * (ww + b), y0 + dy * s + ny * (ww + b));
  }
  for (let i = n; i >= 0; i--) {
    const s = i / n, ww = w * (1 - s * taper) * .5, b = Math.sin(s * Math.PI) * wob;
    g.lineTo(x0 + dx * s - nx * (ww - b), y0 + dy * s - ny * (ww - b));
  }
  g.fill();
}

// 4 wisps of steam, 1024x256 each, stacked: horizontal paper cuts.
export function mistAtlas() {
  const W = 1024, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H * 4;
  const g = c.getContext('2d');
  for (let v = 0; v < 4; v++) {
    const R = mulberry(880 + v * 29), oy = v * H;
    for (let y = 30; y < H - 30; y += 8 + R() * 8) {
      const s = (y - 30) / (H - 60), env = Math.pow(Math.sin(s * Math.PI), .7);
      const half = W * .46 * env * (.7 + R() * .3), cx = W / 2 + (R() - .5) * 120;
      let x = cx - half;
      while (x < cx + half) {
        const len = 40 + R() * 260, gap = 10 + R() * 90;
        if (R() < .7) {
          const x1 = Math.min(cx + half, x + len), wv = Math.sin(x * .01 + v) * 3;
          cut(g, x, oy + y + wv, x1, oy + y + wv + (R() - .5) * 4, 4 + R() * 8 * env, R, PAPER, .9);
        }
        x += len + gap;
      }
    }
  }
  return c;
}

// Hanging rubber raincoats (4 variants, 256x512 each) for workshop racks.
export function coatAtlas() {
  const TW = 256, TH = 512, N = 4;
  const c = document.createElement('canvas'); c.width = TW * N; c.height = TH;
  const g = c.getContext('2d');
  for (let v = 0; v < N; v++) {
    const R = mulberry(303 + v * 41), ox = v * TW + TW / 2;
    const sw = 48 + R() * 14, hw = 78 + R() * 16;
    // collar hook
    g.strokeStyle = PAPER; g.lineWidth = 4;
    g.beginPath(); g.arc(ox, 34, 12, Math.PI, 0); g.stroke();
    // coat silhouette in ink with paper fold cuts
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(ox - 18, 46); g.lineTo(ox + 18, 46);
    g.lineTo(ox + sw, 78); g.lineTo(ox + sw + 22, 230); g.lineTo(ox + sw - 4, 238);
    g.lineTo(ox + sw - 12, 132); g.lineTo(ox + hw, 455);
    g.lineTo(ox - hw, 455);
    g.lineTo(ox - sw + 12, 132); g.lineTo(ox - sw + 4, 238); g.lineTo(ox - sw - 22, 230);
    g.lineTo(ox - sw, 78);
    g.closePath(); g.fill();
    // paper outline & vertical fold cuts
    g.strokeStyle = PAPER; g.lineWidth = 2.5; g.stroke();
    for (let i = 0; i < 9; i++) {
      const x = ox + (R() - .5) * hw * 1.1, y0 = 90 + R() * 140, len = 80 + R() * 180;
      cut(g, x, y0, x + (R() - .5) * 14, Math.min(440, y0 + len), 2.5 + R() * 2, R, PAPER, .85);
    }
    // button placket
    for (let y = 85; y < 380; y += 52) {
      g.fillStyle = PAPER; g.beginPath(); g.arc(ox + 2, y, 4, 0, 7); g.fill();
    }
  }
  return c;
}

// A crescent/full moon behind high bay fog
export function moonCanvas(S = 512) {
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d'), R = mulberry(77), m = S / 2;
  g.fillStyle = PAPER; g.beginPath(); g.arc(m, m, 95, 0, Math.PI * 2); g.fill();
  for (const [dx, dy, L] of [[-40, -30, 48], [-12, -10, 62], [-50, 12, 44], [-18, 28, 55]]) {
    const x = m + dx, y = m + dy;
    cut(g, x, y, x + L, y + (R() - .5) * 3, 6, R, INK);
  }
  return c;
}
