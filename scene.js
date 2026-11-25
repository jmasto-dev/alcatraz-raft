// Fifty Raincoats — Scratchboard Long Take.
// One unbroken 3D camera move from Alcatraz Island at night, through the upper raincoat workshop
// and prison steam pipes, through the steam onto the seawall bellows, and out into San Francisco Bay.
import * as THREE from 'three';
import { clamp, lerp, ss, track } from '/core/lib.js';
const step01 = (a, b, x) => ss((x - a) / (b - a));
import { C, U, skyMat, bayMat, GLSL_HASH } from './look.js';
import { buildWorld, canvasTex } from './world.js';
import { T, VO } from './timeline.js';
import { skyTypeCanvas, FONT } from './props.js';

const Q = new URLSearchParams(location.search);
const W_ = 1920, H_ = 1080, SS = 2;
window.DUR = T.DUR;

// ---------------------------------------------------------------- renderer & 2x targets
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W_, H_, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);
const rtA = new THREE.WebGLRenderTarget(W_ * SS, H_ * SS);
const rtB = new THREE.WebGLRenderTarget(W_ * SS, H_ * SS);

const scene = new THREE.Scene(); scene.background = C.ink;
const camera = new THREE.PerspectiveCamera(36, W_ / H_, 0.25, 9000);
const projScale = () => H_ * SS / (2 * Math.tan(camera.fov * Math.PI / 360));

const fontFace = await new FontFace('NotoSerifSC', 'url(./fonts/NotoSerifSC-700.woff2)', { weight: '700' }).load();
document.fonts.add(fontFace);

const W = buildWorld(scene, projScale());

// ---------------------------------------------------------------- sky type plates
const titlePlate = skyTypeCanvas([
  { id: 'title-main', text: 'FIFTY RAINCOATS', x: 60, y: 260, px: 170 },
  { id: 'title-sub',  text: 'ALCATRAZ · 1962', x: 65, y: 400, px: 82 },
], 2200, 520);
const endPlate = skyTypeCanvas([
  { id: 'end-date', text: 'JUNE 11, 1962', x: 60, y: 240, px: 165 },
], 1800, 360);

skyMat.uniforms.tType1.value = canvasTex(titlePlate.c, false);
skyMat.uniforms.tType2.value = canvasTex(endPlate.c, false);
// Sky direction space uses az = atan(d.x, -d.z), el = asin(d.y).
// Opening camera looks toward az ~ -0.44 rad; place FIFTY RAINCOATS in upper-left sky:
skyMat.uniforms.uRect1.value.set(-0.84, 0.07, -0.32, 0.18);
// Ending camera looks toward az ~ -0.08 rad; place JUNE 11, 1962 in upper sky above headlands:
skyMat.uniforms.uRect2.value.set(-0.30, 0.08, 0.16, 0.17);

// ---------------------------------------------------------------- print pass
const subCanvas = document.createElement('canvas');
subCanvas.width = W_; subCanvas.height = H_;
const subCtx = subCanvas.getContext('2d');
const subTex = new THREE.CanvasTexture(subCanvas);
subTex.colorSpace = THREE.LinearSRGBColorSpace;
subTex.minFilter = THREE.LinearFilter;

const printMat = new THREE.ShaderMaterial({
  uniforms: {
    tA: { value: rtA.texture }, tB: { value: rtB.texture }, uT: { value: 0 },
    uRes: { value: new THREE.Vector2(W_, H_) },
    uPeel: { value: -1 }, uWhite: { value: 0 }, uFresh: { value: 0 },
    tSub: { value: subTex }, uPaper: U.uPaper, uInk: U.uInk,
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`,
  fragmentShader: GLSL_HASH + `
    uniform sampler2D tA, tB, tSub; uniform float uT, uPeel, uWhite, uFresh; uniform vec2 uRes; uniform vec3 uPaper, uInk; varying vec2 vUv;
    float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=.5; } return s; }
    void main(){
      vec2 uv = vUv;
      vec3 c = texture2D(tA, uv).rgb;
      float lum = dot(c, vec3(.299,.587,.114));
      float dark = 1. - smoothstep(.18, .55, lum);
      float tf = floor(uT*12.)/12.;
      float fib = fbm(uv*vec2(700.,420.));
      c *= 1. + (fib-.5)*.06*(1.-dark);
      float mot = fbm(uv*vec2(46.,26.) + 3.);
      c += dark*(mot-.5)*.05;
      float b = fbm(vec2(uv.x*4.2 + tf*.06, uv.y*2.2 - tf*.02) + 11.);
      b = smoothstep(.5, .78, b) * smoothstep(.62, 1., uv.y);
      c += dark*b*.08;
      if (uWhite > 0.) {
        float row = floor(uv.y*120.), f = abs(fract(uv.y*120.)-.5);
        float r = h11(row*1.7), run = vn(vec2(uv.x*3. + r*20., row*.37));
        float w = smoothstep(.0, .25, uWhite*1.8 - r*.5 - run*.5 + (.5-f)*.3);
        c = mix(c, uPaper*(1. + (fib-.5)*.05), clamp(w, 0., 1.));
      }
      c *= 1. + (h11(tf*13.7)-.5)*.03;
      vec2 q = uv-.5; c *= 1. - dot(q,q)*.1;
      vec4 sb = texture2D(tSub, uv); c = mix(c, sb.rgb, sb.a);
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), printMat));

// ---------------------------------------------------------------- camera path (continuous long take)
const CAM_KEYS = [
  [0.0,  [38.0, 42.0, 96.0,   -8.0, 28.0, -10.0]],
  [4.5,  [28.0, 35.0, 52.0,    0.0, 27.5,  -2.0]],
  [7.4,  [18.0, 31.0, 15.0,   10.5, 29.4,   1.0]],
  [9.0,  [12.6, 29.8,  3.2,    7.4, 29.1,  -1.8]],
  [13.0, [ 9.4, 29.5,  2.6,    7.2, 29.2,  -2.0]],
  [16.0, [ 3.2, 29.6,  2.2,   -1.8, 29.4,  -0.8]],
  [19.5, [-1.4, 29.7,  1.8,   -2.5, 29.4,  -0.8]],
  [22.6, [-5.4, 29.9,  0.2,   -7.0, 29.9,  -0.8]],
  [23.2, [-6.8, 29.9, -0.8,   -8.5, 29.9,  -0.8]],
  // After <0.45s steam whiteout, emerge on seawall dock (z = -30.8)
  [23.7, [-7.2,  3.8, -25.0, -11.4,  2.4, -30.8]],
  [29.5, [-7.8,  3.5, -25.8, -11.2,  2.2, -31.2]],
  [32.2, [-11.2, 2.3, -25.8, -11.2,  0.3, -34.5]],
  [34.5, [-11.2, 2.4, -40.0, -11.2,  0.3, -52.0]],
  [39.5, [-11.2, 2.5, -70.0, -11.2,  0.5, -92.0]],
  [44.0, [-6.0, 14.0, -76.0, -11.2,  3.0, -145.0]],
  [48.0, [-2.0, 24.0, -68.0, -11.2,  8.0, -195.0]],
];
const camTrack = track(CAM_KEYS);

// ---------------------------------------------------------------- subtitles
let subDurs = null;
try {
  const r = await fetch('./voice/dur.json');
  if (r.ok) subDurs = await r.json();
} catch {}

function drawSubtitle(t) {
  subCtx.clearRect(0, 0, W_, H_);
  if (Q.get('subs') === '0') return;
  let active = null;
  for (const v of VO) {
    const d = subDurs?.[v.id] ?? (v.text.length / 15 + 1.2);
    if (t >= v.t && t <= v.t + d + 0.35) { active = v.text; break; }
  }
  if (!active) return;
  subCtx.font = `700 34px ${FONT}`;
  const tw = subCtx.measureText(active).width;
  const padX = 32, padY = 16, bw = tw + padX * 2, bh = 58;
  const x = (W_ - bw) / 2, y = H_ - 54 - bh;
  subCtx.fillStyle = 'rgba(22, 23, 27, 0.82)';
  subCtx.fillRect(x, y, bw, bh);
  subCtx.fillStyle = '#ede5cd';
  subCtx.textAlign = 'center';
  subCtx.textBaseline = 'middle';
  subCtx.fillText(active, W_ / 2, y + bh / 2 + 2);
}

// ---------------------------------------------------------------- sound / cue events
window.EV = [
  { t: T.TITLE_IN, type: 'carve_title' },
  { t: T.VENT_PASS, type: 'vent_whoosh' },
  { t: 11.2, type: 'shears_snip' },
  { t: 16.5, type: 'clamp_clack' },
  { t: T.STEAM_IN, type: 'steam_burst' },
  ...T.PUMP_STROKES.map(t => ({ t, type: 'bellows_pump' })),
  { t: T.VALVE_CLICK, type: 'valve_click' },
  { t: T.LAUNCH_STROKE, type: 'raft_splash' },
  ...T.PADDLES.map(t => ({ t, type: 'paddle_stroke' })),
  { t: T.END_DATE_IN, type: 'carve_date' },
];

// ---------------------------------------------------------------- main render(t)
window.render = (t) => {
  t = clamp(t, 0, T.DUR);

  // Camera
  const camOverride = Q.get('cam');
  if (camOverride) {
    const p = camOverride.split(',').map(Number);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(p[3], p[4], p[5]);
  } else {
    // Hard jump across the 23.3 -> 23.8 whiteout peak so workshop -> seawall is instantaneous under full paper
    const ct = (t >= 23.3 && t < 23.45) ? 23.3 : t;
    const c = camTrack(ct);
    camera.position.set(c[0], c[1], c[2]);
    camera.lookAt(c[3], c[4], c[5]);
  }
  camera.updateMatrixWorld();

  // Lighting & sky
  U.uL.value.set(-0.55, 0.58, 0.6).normalize();
  U.uCam.value.copy(camera.position);
  skyMat.uniforms.uCam.value.copy(camera.position);
  skyMat.uniforms.uStars.value = 1.0;
  skyMat.uniforms.uDense.value = 0.0;
  skyMat.uniforms.uAmt1.value = step01(T.TITLE_IN, T.TITLE_IN + 1.2, t) * (1 - step01(T.TITLE_OUT, T.TITLE_OUT + 1.0, t));
  skyMat.uniforms.uAmt2.value = step01(T.END_DATE_IN, T.END_DATE_IN + 1.1, t);

  // Searchlight sweep over bay during opening
  bayMat.uniforms.uT.value = t;
  const spotX = Math.sin(t * 0.65) * 32;
  bayMat.uniforms.uSpot.value.set(spotX, 0, -28);
  bayMat.uniforms.uSpotOn.value = 1 - step01(7.0, 9.0, t);

  // Steam whiteout (< 0.45 s full paper around 23.2 s)
  const wIn = step01(22.65, 23.02, t);
  const wOut = 1 - step01(23.38, 23.68, t);
  printMat.uniforms.uWhite.value = wIn * wOut;
  printMat.uniforms.uT.value = t;

  // Concertina bellows animation & raft inflation (23.8 .. 31.5 s)
  let squeeze = 0;
  for (const pt of T.PUMP_STROKES) {
    const dt = t - pt;
    if (dt >= 0 && dt <= 1.2) squeeze = Math.max(squeeze, Math.sin(clamp(dt / 0.85, 0, 1) * Math.PI));
  }
  const inflated = step01(24.5, 30.8, t);
  W.setBellows(squeeze, inflated);

  // Raft launch onto San Francisco Bay (32.0 .. 48.0 s)
  if (t < 31.6) {
    W.raft.position.set(-11.2, 2.02, -30.8);
    W.raft.rotation.set(0, 0, 0);
    W.wakeMesh.visible = false;
    W.bellows.visible = true;
  } else {
    const u = clamp((t - 31.6) / 16.4, 0, 1);
    const slide = step01(31.6, 32.5, t);
    const rz = lerp(-30.8, -142.0, Math.pow(u, 1.12));
    const ry = lerp(2.02, 0.16 + Math.sin(t * 2.2) * 0.05, slide);
    W.raft.position.set(-11.2 + Math.sin(t * 0.4) * 0.6 * slide, ry, rz);
    W.raft.rotation.set(Math.sin(t * 1.9) * 0.035 * slide, 0, Math.cos(t * 1.5) * 0.025 * slide);
    W.wakeMesh.visible = slide > 0.5;
    W.wakeMesh.scale.setScalar(1 + (Math.sin(t * 4) * 0.15));
    W.bellows.visible = t < 32.1;
  }

  // Paddle strokes
  for (let i = 0; i < 2; i++) {
    let ang = 0;
    for (const pt of T.PADDLES) {
      const dt = t - pt;
      if (dt >= 0 && dt <= 1.4) ang = Math.sin((dt / 1.4) * Math.PI * 2) * 0.42;
    }
    W.paddles[i].rotation.x = ang;
    W.paddles[i].rotation.z = (i === 0 ? -0.35 : 0.35);
  }

  // Subtitles
  drawSubtitle(t);
  subTex.needsUpdate = true;

  // Render 3D scene -> 2x rtA -> print pass -> screen
  renderer.setRenderTarget(rtA);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
};

window.TEXTS = (t) => {
  const out = [];
  if (t >= T.TITLE_IN + 0.5 && t <= T.TITLE_OUT) {
    out.push({ id: 'title-main', text: 'FIFTY RAINCOATS', x0: 140, y0: 120, x1: 920, y1: 240 });
  }
  if (t >= 9.5 && t <= 14.5) {
    out.push({ id: 'board-50', text: '50+ COATS', x0: 520, y0: 260, x1: 1180, y1: 520 });
  }
  if (t >= 24.5 && t <= 29.5) {
    out.push({ id: 'board-614', text: '6 x 14 FT', x0: 240, y0: 240, x1: 720, y1: 480 });
  }
  if (t >= T.END_DATE_IN + 0.6 && t <= T.DUR) {
    out.push({ id: 'end-date', text: 'JUNE 11, 1962', x0: 400, y0: 140, x1: 1200, y1: 260 });
  }
  return out;
};

window.READY = true;
