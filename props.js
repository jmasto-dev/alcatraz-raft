// Props with words in the world: sky plates and workshop/raft stencils.
import { mulberry } from '/core/lib.js';
import { INK, PAPER, cut } from './textures.js';

export const FONT = `'NotoSerifSC', serif`;
const font = (px) => `700 ${px}px ${FONT}`;

function carvedText(g, text, x, y, px, R, opts = {}) {
  g.font = font(px); g.textBaseline = 'alphabetic'; g.textAlign = opts.align || 'left';
  g.fillStyle = opts.col || PAPER; g.fillText(text, x, y);
  if (opts.nicks !== false) {
    const w = g.measureText(text).width;
    const x0 = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
    g.save(); g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < w / 18; i++) {
      const xx = x0 + R() * w, yy = y - R() * px * .8;
      cut(g, xx, yy, xx + 6 + R() * 14, yy + (R() - .5) * 2, 1.6, R, INK);
    }
    g.restore();
  }
  return g.measureText(text).width;
}

// Stencil / carved plate in the world (e.g. "50+ COATS", "6 x 14 FT")
export function stencilCanvas(main, sub = '', seed = 31) {
  const W = 1024, H = 480, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = mulberry(seed);
  g.fillStyle = INK; g.fillRect(0, 0, W, H);
  // wood/metal border & rivets
  g.strokeStyle = PAPER; g.lineWidth = 8; g.strokeRect(24, 24, W - 48, H - 48);
  g.lineWidth = 3; g.strokeRect(42, 42, W - 84, H - 84);
  for (const [x, y] of [[68, 68], [W - 68, 68], [68, H - 68], [W - 68, H - 68]]) {
    g.fillStyle = PAPER; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill();
  }
  // subtle horizontal wood/plate cuts
  for (let i = 0; i < 28; i++) {
    const y = 60 + R() * (H - 120), x = 60 + R() * (W - 220);
    cut(g, x, y, x + 50 + R() * 120, y + (R() - .5) * 3, 2, R, '#2b2c31');
  }
  carvedText(g, main, W / 2, sub ? 255 : 295, 165, R, { align: 'center', nicks: true });
  if (sub) carvedText(g, sub, W / 2, 390, 74, R, { align: 'center', nicks: false });
  return c;
}

// Plates of carved type for the direction-space sky (title, end date)
export function skyTypeCanvas(lines, W = 2400, H = 820) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = mulberry(4);
  const boxes = [];
  for (const L of lines) {
    const w = carvedText(g, L.text, L.x ?? 40, L.y, L.px, R, { nicks: true });
    boxes.push({
      id: L.id, text: L.text,
      u0: (L.x ?? 40) / W, u1: ((L.x ?? 40) + w) / W,
      v0: (L.y - L.px * .92) / H, v1: (L.y + L.px * .22) / H,
    });
  }
  return { c, boxes };
}
