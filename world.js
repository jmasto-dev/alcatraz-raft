// 3D world for Fifty Raincoats: San Francisco Bay, Marin Headlands, Alcatraz cellblock,
// upper raincoat workshop, prison steam pipes, seawall dock, concertina bellows, and the 6x14 ft raft.
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';
import {
  C, U, carveMat, bayMat, rubberMat, pipeMat, woodMat, concreteMat,
  inkMat, paperMat, redMat, warmMat, billboardMat, skyMat
} from './look.js';
import { mistAtlas, coatAtlas, moonCanvas } from './textures.js';
import { stencilCanvas } from './props.js';

export const canvasTex = (c, mips = true) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.generateMipmaps = mips;
  if (!mips) t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
};

// Faceted low-poly rock/headland ridge
function headland(cx, cz, w, h, d, seed) {
  const R = mulberry(seed), segs = 9;
  const g = new THREE.ConeGeometry(w, h, segs, 3);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 - (y + h / 2) / h;
    p.setX(i, x + (R() - .5) * w * .22 * k);
    p.setZ(i, (z * (d / w)) + (R() - .5) * d * .22 * k);
    p.setY(i, y + (R() - .5) * h * .12 * (1 - Math.abs(y / (h / 2))));
  }
  const m = new THREE.Mesh(g.toNonIndexed(), carveMat(0.45));
  m.geometry.computeVertexNormals();
  m.position.set(cx, h / 2 - 2, cz);
  return m;
}

// Minimum-size red point marker so the single red valve never vanishes at distance
function redPointMat(proj) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: C.red.clone() }, uProj: { value: proj }, uMin: { value: 5.0 } },
    vertexShader: `
      uniform float uProj, uMin;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(uProj * 0.24 / max(-mv.z, 0.5), uMin);
      }`,
    fragmentShader: `
      uniform vec3 uCol;
      void main() {
        vec2 d = gl_PointCoord - .5;
        if (dot(d, d) > .25) discard;
        gl_FragColor = vec4(uCol, 1.);
      }`,
    depthTest: true, depthWrite: true,
  });
}

export function buildWorld(scene, projScale) {
  // ---------------------------------------------------------------- Sky dome (direction space)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 32), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  // Moon high in the northwest sky
  const moonTex = canvasTex(moonCanvas(), false);
  const moon = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, alphaTest: 0.4, depthWrite: false })
  );
  moon.position.set(-420, 310, -1400);
  moon.lookAt(0, 20, 0);
  scene.add(moon);

  // ---------------------------------------------------------------- San Francisco Bay & Marin Headlands
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600), bayMat);
  bay.rotation.x = -Math.PI / 2;
  scene.add(bay);

  const headlands = new THREE.Group();
  for (const [cx, cz, w, h, d, s] of [
    [-520, -720, 260, 110, 140, 11],
    [-260, -680, 210, 88, 120, 12],
    [-80,  -760, 180, 74, 110, 13],
    [220,  -710, 240, 96, 130, 14],
    [480,  -740, 280, 118, 150, 15],
  ]) headlands.add(headland(cx, cz, w, h, d, s));
  scene.add(headlands);

  // ---------------------------------------------------------------- Alcatraz Island & Cellblock
  const island = new THREE.Group();
  // Rocky base (kept within z = -16..16 so seawall dock at z = -30 is completely clear)
  for (const [cx, cz, w, h, d, s] of [
    [0, 0, 52, 14, 28, 21],
    [-28, 6, 26, 13, 20, 22],
    [26, -2, 24, 12, 18, 23],
  ]) island.add(headland(cx, cz, w, h, d, s));

  // Main Cellblock Building (y = 14..27)
  const cellblock = new THREE.Mesh(new THREE.BoxGeometry(44, 13, 22), concreteMat);
  cellblock.position.set(0, 20.5, 0);
  island.add(cellblock);

  // Cellblock barred window bays (south/north faces)
  for (let x = -18; x <= 18; x += 6) {
    for (const zSign of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.6, 7.5, 0.4), inkMat);
      win.position.set(x, 20.5, zSign * 11.05);
      island.add(win);
      for (let b = -0.8; b <= 0.8; b += 0.8) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7.5, 0.5), paperMat);
        bar.position.set(x + b, 20.5, zSign * 11.08);
        island.add(bar);
      }
    }
  }

  // Lighthouse tower (west end)
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.8, 26, 10), concreteMat);
  tower.position.set(-26, 27, 10);
  island.add(tower);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 10), warmMat);
  lantern.position.set(-26, 41.2, 10);
  island.add(lantern);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.2, 10), inkMat);
  cap.position.set(-26, 43.4, 10);
  island.add(cap);

  // Upper Utility Workshop Tier (y = 27..33, open on east/south for camera entry)
  const wsFloor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 12), concreteMat);
  wsFloor.position.set(1, 27.0, 0);
  island.add(wsFloor);
  const wsRoof = new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 12), concreteMat);
  wsRoof.position.set(1, 33.2, 0);
  island.add(wsRoof);
  const wsBack = new THREE.Mesh(new THREE.BoxGeometry(30, 6.2, 0.6), concreteMat);
  wsBack.position.set(1, 30.1, -5.8);
  island.add(wsBack);
  const wsWest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.2, 12), concreteMat);
  wsWest.position.set(-13.8, 30.1, 0);
  island.add(wsWest);
  // South wall with wide vent opening at x = 10..15.5 so camera glides through cleanly
  const wsSouthL = new THREE.Mesh(new THREE.BoxGeometry(23.5, 6.2, 0.6), concreteMat);
  wsSouthL.position.set(-2.2, 30.1, 5.8);
  island.add(wsSouthL);
  // Vent bars spaced 1.1 m apart at x = 11.2, 12.3, 13.4, 14.5 (camera passes between 12.3 and 13.4!)
  for (const bx of [10.4, 11.5, 13.8, 14.9]) {
    const vbar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.6, 6), inkMat);
    vbar.position.set(bx, 30.1, 5.8);
    island.add(vbar);
  }
  scene.add(island);

  // ---------------------------------------------------------------- Inside Upper Workshop
  const workshop = new THREE.Group();
  // Hanging rubber raincoats along back wall
  const coatTex = canvasTex(coatAtlas(), true);
  coatTex.wrapS = THREE.ClampToEdgeWrapping;
  const coatMat = billboardMat(coatTex, 0, { fade: 0 });
  const coatMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 2.2), coatMat, 8);
  const dummy = new THREE.Object3D();
  const tiles = [];
  for (let i = 0; i < 8; i++) {
    dummy.position.set(1.5 + i * 1.45, 29.5, -4.6 + (i % 2) * 0.2);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    coatMesh.setMatrixAt(i, dummy.matrix);
    tiles.push((i % 4) / 4, 0, 0.25, 1);
  }
  coatMesh.geometry.setAttribute('aTile', new THREE.InstancedBufferAttribute(new Float32Array(tiles), 4));
  workshop.add(coatMesh);

  // Workbench (woodMat)
  const bench = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.1, 2.4), woodMat);
  bench.position.set(7.6, 27.85, -0.8);
  workshop.add(bench);

  // Folded stacks of rubber raincoats on workbench
  for (let s = 0; s < 5; s++) {
    const stack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.85), rubberMat);
    stack.position.set(5.4 + (s % 3) * 1.3, 28.47 + Math.floor(s / 3) * 0.15, -0.6 + (s % 2) * 0.4);
    stack.rotation.y = (s - 2) * 0.12;
    workshop.add(stack);
  }

  // Tailor's shears on workbench
  for (const ang of [0.22, -0.22]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 0.09), paperMat);
    blade.position.set(9.2, 28.44, -0.4);
    blade.rotation.y = ang;
    workshop.add(blade);
  }

  // Stencil Board: "50+ COATS"
  const board50Tex = canvasTex(stencilCanvas('50+ COATS', 'RUBBERIZED SHELLS', 31), false);
  const board50 = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.22, 0.14),
    [inkMat, inkMat, inkMat, inkMat, new THREE.MeshBasicMaterial({ map: board50Tex }), inkMat]
  );
  board50.position.set(7.4, 29.25, -2.1);
  board50.rotation.y = 0.25;
  workshop.add(board50);

  // Prison Steam Pipes (x = -11 .. +3.5, y = 29.15 & 29.7, z = -0.8)
  for (const py of [29.1, 29.75]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 14.5, 12), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-3.8, py, -0.8);
    workshop.add(pipe);
  }
  // Valve wheel on steam pipe
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 6, 14), paperMat);
  wheel.position.set(-0.2, 29.75, -0.48);
  workshop.add(wheel);

  // Vulcanizing Clamp & Rubber Seam pressed onto the hot steam pipe
  const clampRubber = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.72), rubberMat);
  clampRubber.position.set(-2.4, 29.36, -0.78);
  workshop.add(clampRubber);
  const clampBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.78), woodMat);
  clampBar.position.set(-2.4, 29.42, -0.78);
  workshop.add(clampBar);

  // Steam Wisps billowing around the pipe end (x = -7.5 .. -4.5)
  const mistTex = canvasTex(mistAtlas(), false);
  const mistMat = billboardMat(mistTex, 0, { fade: 0 });
  const mistMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 1.1), mistMat, 14);
  const Rm = mulberry(701), mTiles = [];
  for (let i = 0; i < 14; i++) {
    dummy.position.set(-5.2 - Rm() * 3.8, 28.9 + Rm() * 2.2, -1.6 + Rm() * 1.8);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mistMesh.setMatrixAt(i, dummy.matrix);
    mTiles.push(0, (i % 4) / 4, 1, 0.25);
  }
  mistMesh.geometry.setAttribute('aTile', new THREE.InstancedBufferAttribute(new Float32Array(mTiles), 4));
  workshop.add(mistMesh);
  scene.add(workshop);

  // ---------------------------------------------------------------- Seawall Dock & Pilings (z = -30 .. -60)
  const seawall = new THREE.Group();
  const wallLedge = new THREE.Mesh(new THREE.BoxGeometry(22, 2.2, 6), concreteMat);
  wallLedge.position.set(-12, 0.7, -30);
  seawall.add(wallLedge);

  const dockPlanks = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 4.5), woodMat);
  dockPlanks.position.set(-11, 1.9, -30.5);
  seawall.add(dockPlanks);

  // Wooden seawall pilings framing the launch channel
  for (const [px, pz, ph] of [
    [-17.0, -37, 4.6], [-5.8, -38, 4.2],
    [-17.5, -47, 4.8], [-5.2, -49, 4.4],
    [-18.0, -60, 4.5], [-4.5, -62, 4.1],
  ]) {
    const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, ph, 8), woodMat);
    piling.position.set(px, ph / 2 - 0.5, pz);
    seawall.add(piling);
  }

  // Stencil Board at Seawall: "6 x 14 FT"
  const board614Tex = canvasTex(stencilCanvas('6 × 14 FT', 'INFLATABLE HULL', 62), false);
  const board614 = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.12, 0.14),
    [inkMat, inkMat, inkMat, inkMat, new THREE.MeshBasicMaterial({ map: board614Tex }), inkMat]
  );
  board614.position.set(-14.6, 2.9, -30.4);
  board614.rotation.y = 0.35;
  seawall.add(board614);
  scene.add(seawall);

  // ---------------------------------------------------------------- The 6x14 ft Raft, Concertina Bellows & Red Valve
  const raft = new THREE.Group();
  // Perimeter inflatable pontoons (4.2 m long x 1.85 m wide)
  const sideL = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 3.6, 10), rubberMat);
  sideL.rotation.x = Math.PI / 2; sideL.position.set(-0.78, 0.26, 0);
  const sideR = sideL.clone(); sideR.position.x = 0.78;
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.26, 8, 12, Math.PI), rubberMat);
  bow.rotation.x = Math.PI / 2; bow.rotation.z = Math.PI; bow.position.set(0, 0.26, -1.8);
  const stern = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.56, 10), rubberMat);
  stern.rotation.z = Math.PI / 2; stern.position.set(0, 0.26, 1.8);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 3.6), rubberMat);
  deck.position.set(0, 0.12, 0);
  raft.add(sideL, sideR, bow, stern, deck);

  // Two wooden paddles
  const paddles = [];
  for (const s of [-1, 1]) {
    const pg = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.75, 6), woodMat);
    shaft.rotation.x = Math.PI / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.55), woodMat);
    blade.position.z = -0.85;
    pg.add(shaft, blade);
    pg.position.set(s * 0.92, 0.42, 0.1);
    raft.add(pg);
    paddles.push(pg);
  }

  // THE ONE RED: Rubber intake valve on the stern pontoon + minimum-size red point
  const valveMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.18, 10), redMat);
  valveMesh.position.set(0.32, 0.52, 1.75);
  raft.add(valveMesh);

  const valveGeo = new THREE.BufferGeometry();
  valveGeo.setAttribute('position', new THREE.Float32BufferAttribute([0.32, 0.56, 1.75], 3));
  const valvePt = new THREE.Points(valveGeo, redPointMat(projScale));
  valvePt.frustumCulled = false;
  raft.add(valvePt);

  // Red ripple trace behind the raft (only visible once on the water)
  const wakeMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.48, 18),
    new THREE.MeshBasicMaterial({ color: C.red, side: THREE.DoubleSide })
  );
  wakeMesh.rotation.x = -Math.PI / 2;
  wakeMesh.position.set(0.32, 0.04, 2.4);
  wakeMesh.visible = false;
  raft.add(wakeMesh);

  raft.position.set(-11.2, 2.02, -30.8);
  scene.add(raft);

  // Concertina Bellows (sits beside the raft on the dock during inflation)
  const bellows = new THREE.Group();
  const bTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), woodMat);
  const bBot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), woodMat);
  const bCore = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.38), paperMat);
  bCore.position.y = 0.25;
  bTop.position.y = 0.5;
  bellows.add(bBot, bCore, bTop);
  // Rubber hose from bellows to the red valve
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 6), inkMat);
  hose.rotation.z = Math.PI / 2;
  hose.position.set(-0.52, 0.15, 0);
  bellows.add(hose);
  bellows.position.set(-10.0, 2.05, -29.05);
  scene.add(bellows);

  // Sky plate for end date ("JUNE 11, 1962") - world-locked or sky-locked via skyMat
  return {
    raft, paddles, bellows, bTop, bCore, wakeMesh, mistMesh,
    setBellows(squeeze, inflated) {
      // squeeze 0..1 compresses accordion
      const h = 0.46 - squeeze * 0.26;
      bCore.scale.y = h / 0.45;
      bCore.position.y = h / 2 + 0.03;
      bTop.position.y = h + 0.06;
      // raft inflates from 0.55 to 1.0
      const sc = 0.55 + 0.45 * inflated;
      raft.scale.set(1, sc, 1);
    },
  };
}
