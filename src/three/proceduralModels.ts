import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DesignElement, DesignSurface, ModelPreset } from '../types/viverde';

const textureCache = new Map<string, THREE.CanvasTexture>();
const gltfLoader = new GLTFLoader();
const loadedGltfCache = new Map<string, THREE.Group>();

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else if (mat) {
      mat.dispose();
    }
  });
}

function getContactShadowTexture(): THREE.CanvasTexture {
  const key = 'contact_shadow';
  if (textureCache.has(key)) return textureCache.get(key)!;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(18, 30, 22, 0.42)');
  grad.addColorStop(0.5, 'rgba(18, 30, 22, 0.18)');
  grad.addColorStop(1, 'rgba(18, 30, 22, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

function getBarkTexture(variant: 'brown' | 'birch' | 'pine' | 'wood'): THREE.CanvasTexture {
  const key = `bark_${variant}`;
  if (textureCache.has(key)) return textureCache.get(key)!;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (variant === 'birch') {
    ctx.fillStyle = '#EAE6DF';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 120; i++) {
      const y = Math.random() * size;
      const x = Math.random() * size;
      const w = 14 + Math.random() * 44;
      ctx.fillStyle = Math.random() > 0.35 ? '#35322F' : '#857F76';
      ctx.fillRect(x, y, w, 2 + Math.random() * 3);
    }
  } else if (variant === 'wood') {
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? '#7E5435' : '#966744';
      ctx.fillRect(0, y, size, 30);
      ctx.fillStyle = '#5B3A23';
      ctx.fillRect(0, y + 30, size, 2);
    }
    for (let i = 0; i < 450; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(60,35,18,0.18)' : 'rgba(195,145,105,0.14)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 24 + Math.random() * 50, 1.5);
    }
  } else {
    ctx.fillStyle = variant === 'pine' ? '#6F4A36' : '#5E4D3E';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 700; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle =
        variant === 'pine'
          ? Math.random() > 0.5
            ? '#8A5B40'
            : '#4A3022'
          : Math.random() > 0.5
            ? '#74604F'
            : '#44372C';
      ctx.fillRect(x, y, 3 + Math.random() * 4, 18 + Math.random() * 32);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

function getWaterRippleTexture(): THREE.CanvasTexture {
  const key = 'water_ripple';
  if (textureCache.has(key)) return textureCache.get(key)!;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const n1 = Math.sin(x * 0.09 + y * 0.05) * 18;
      const n2 = Math.cos(y * 0.11 - x * 0.04) * 18;
      const r = Math.max(0, Math.min(255, Math.round(128 + n1)));
      const g = Math.max(0, Math.min(255, Math.round(128 + n2)));
      ctx.fillStyle = `rgb(${r},${g},255)`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

export function createProceduralSurfaceTexture(
  kind: 'grass' | 'gravel' | 'bark' | 'path' | 'bed' | 'soil',
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const key = `surf_${kind}`;
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'grass') {
    ctx.fillStyle = '#4B7D41';
    ctx.fillRect(0, 0, size, size);
    // Subtle lawn mowing stripes + dense grass blades
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = 0; x < size; x += 128) {
      ctx.fillRect(x, 0, 64, size);
    }
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const tone = Math.random();
      ctx.fillStyle =
        tone > 0.72
          ? '#6EA35C'
          : tone > 0.4
            ? '#568B4A'
            : tone > 0.15
              ? '#3D6933'
              : '#7FB26A';
      ctx.fillRect(x, y, 1.8, 4.5);
    }
  } else if (kind === 'gravel') {
    ctx.fillStyle = '#DED8CA';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const rx = 2 + Math.random() * 4.2;
      const ry = 1.6 + Math.random() * 3.2;
      const tone = Math.random();
      ctx.fillStyle =
        tone > 0.7
          ? '#F3EFE6'
          : tone > 0.42
            ? '#CEC7B9'
            : tone > 0.15
              ? '#B8B0A1'
              : '#A59E90';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'bark') {
    ctx.fillStyle = '#593E2B';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = Math.random() > 0.45 ? '#75533A' : '#40291B';
      ctx.fillRect(-7, -2.5, 14 + Math.random() * 10, 5);
      ctx.restore();
    }
  } else if (kind === 'path') {
    ctx.fillStyle = '#D9D0C2';
    ctx.fillRect(0, 0, size, size);
    const step = 128;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const offset = (y / step) % 2 === 0 ? 0 : step / 2;
        const px = (x + offset) % size;
        ctx.fillStyle = (x + y) % 256 === 0 ? '#E3DACB' : '#CFC5B5';
        ctx.fillRect(px + 3, y + 3, step - 6, step - 6);
        ctx.strokeStyle = '#A89E8E';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, y + 2, step - 4, step - 4);
      }
    }
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(90,80,68,0.08)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
    }
  } else {
    ctx.fillStyle = '#4B3A2C';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 5500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#5E4938' : '#3A2B1F';
      ctx.fillRect(Math.random() * size, Math.random() * size, 3.5, 3.5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.45, 0.45);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

function enableShadows(group: THREE.Object3D): void {
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// Helper: organic curved branch using TubeGeometry
function buildCurvedBranch(
  points: THREE.Vector3[],
  radiusStart: number,
  radiusEnd: number,
  mat: THREE.Material,
  tubularSegments = 10,
  radialSegments = 7,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radiusStart, radialSegments, false);
  // Taper along tube length
  const pos = geo.attributes.position;
  const ringVerts = radialSegments + 1;
  const rings = tubularSegments + 1;
  for (let r = 0; r < rings; r++) {
    const t = r / tubularSegments;
    const scale = 1 - t * (1 - radiusEnd / Math.max(0.001, radiusStart));
    const center = curve.getPointAt(t);
    for (let s = 0; s < ringVerts; s++) {
      const idx = r * ringVerts + s;
      const vx = pos.getX(idx) - center.x;
      const vy = pos.getY(idx) - center.y;
      const vz = pos.getZ(idx) - center.z;
      pos.setXYZ(idx, center.x + vx * scale, center.y + vy * scale, center.z + vz * scale);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

// Helper: organic irregular foliage puff
function buildFoliageCluster(
  radius: number,
  mat: THREE.Material,
  seed: number,
  scaleX = 1.15,
  scaleY = 0.72,
  scaleZ = 1.1,
): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const wobble =
      1 +
      0.14 * Math.sin(vx * 5.2 + seed) * Math.cos(vz * 4.7 - seed) +
      0.08 * Math.sin(vy * 6.3 + seed * 1.7);
    pos.setXYZ(i, vx * wobble * scaleX, vy * wobble * scaleY, vz * wobble * scaleZ);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

// 1. OLIVO MEDITERRÁNEO & OLIVO BONSAI
function buildOliveTree(tintHex: string, isBonsai = false): THREE.Group {
  const group = new THREE.Group();
  const barkTex = getBarkTexture('brown');
  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    color: 0x877664,
    roughness: 0.94,
    metalness: 0.02,
  });
  const baseColor = new THREE.Color(tintHex || '#6E8267');
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.72, metalness: 0.03 }),
    new THREE.MeshStandardMaterial({
      color: baseColor.clone().offsetHSL(0, -0.02, 0.09),
      roughness: 0.68,
      metalness: 0.03,
    }),
    new THREE.MeshStandardMaterial({
      color: baseColor.clone().offsetHSL(0, 0.02, -0.08),
      roughness: 0.78,
      metalness: 0.02,
    }),
  ];

  // Twisted gnarly main trunk
  const trunk = buildCurvedBranch(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.08, 0.35, -0.04),
      new THREE.Vector3(-0.06, 0.78, 0.06),
      new THREE.Vector3(0.03, 1.15, 0.02),
    ],
    isBonsai ? 0.2 : 0.16,
    0.1,
    barkMat,
    12,
    8,
  );
  group.add(trunk);

  // Root buttresses
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    const root = buildCurvedBranch(
      [
        new THREE.Vector3(Math.cos(a) * 0.07, 0.24, Math.sin(a) * 0.07),
        new THREE.Vector3(Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.22),
      ],
      0.065,
      0.025,
      barkMat,
      6,
      6,
    );
    group.add(root);
  }

  // Primary sculptural boughs
  const boughs: [number, number, number, number, number][] = isBonsai
    ? [
        [-0.58, 1.55, 0.22, 0.36, 0.3],
        [0.62, 1.68, -0.18, 0.38, 0.28],
        [-0.12, 1.88, -0.45, 0.34, 0.25],
        [0.14, 2.05, 0.32, 0.35, 0.26],
        [0.0, 2.22, 0.0, 0.42, 0.28],
      ]
    : [
        [-0.48, 1.52, 0.26, 0.48, 0.55],
        [0.52, 1.58, -0.22, 0.5, 0.52],
        [-0.22, 1.62, -0.46, 0.46, 0.5],
        [0.28, 1.55, 0.42, 0.44, 0.48],
        [0.02, 1.92, 0.04, 0.58, 0.55],
      ];

  boughs.forEach(([tx, ty, tz, rad, padScale], idx) => {
    const branch = buildCurvedBranch(
      [
        new THREE.Vector3(0.02, 1.05, 0.02),
        new THREE.Vector3(tx * 0.55, 1.28, tz * 0.55),
        new THREE.Vector3(tx, ty - 0.14, tz),
      ],
      0.065,
      0.028,
      barkMat,
      8,
      6,
    );
    group.add(branch);

    const cloudCount = isBonsai ? 2 : 3;
    for (let c = 0; c < cloudCount; c++) {
      const puff = buildFoliageCluster(
        rad * (c === 0 ? 1 : 0.72),
        leafMats[(idx + c) % leafMats.length],
        idx * 3.1 + c,
        1.25,
        isBonsai ? 0.48 : padScale + 0.16,
        1.15,
      );
      puff.position.set(
        tx + (c === 0 ? 0 : Math.cos(c * 2.1 + idx) * 0.24),
        ty + c * 0.1,
        tz + (c === 0 ? 0 : Math.sin(c * 2.1 + idx) * 0.22),
      );
      group.add(puff);
    }
  });

  return group;
}

// 2. CIPRÉS DE TOSCANA
function buildCypressTree(): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ map: getBarkTexture('brown'), color: 0x5c493b, roughness: 0.92 });
  const darkLeaf = new THREE.MeshStandardMaterial({ color: 0x264430, roughness: 0.84 });
  const midLeaf = new THREE.MeshStandardMaterial({ color: 0x31543d, roughness: 0.78 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.55, 10), trunkMat);
  trunk.position.y = 0.27;
  group.add(trunk);

  // Flame profile via LatheGeometry
  const pts = [
    new THREE.Vector2(0.05, 0.35),
    new THREE.Vector2(0.34, 0.55),
    new THREE.Vector2(0.41, 0.95),
    new THREE.Vector2(0.37, 1.45),
    new THREE.Vector2(0.28, 1.95),
    new THREE.Vector2(0.18, 2.45),
    new THREE.Vector2(0.08, 2.88),
    new THREE.Vector2(0.0, 3.08),
  ];
  const lathe = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), darkLeaf);
  group.add(lathe);

  // Organic foliage tufts along the column
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const a = i * 2.3;
    const rad = (1 - t * 0.72) * 0.26;
    const tuft = buildFoliageCluster(0.16 * (1 - t * 0.45), i % 2 === 0 ? midLeaf : darkLeaf, i, 0.85, 1.45, 0.85);
    tuft.position.set(Math.cos(a) * rad * 0.55, 0.72 + t * 1.9, Math.sin(a) * rad * 0.55);
    group.add(tuft);
  }
  return group;
}

// 3. PINO PIÑONERO MEDITERRÁNEO
function buildPineTree(): THREE.Group {
  const group = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({ map: getBarkTexture('pine'), color: 0x8d5e43, roughness: 0.9 });
  const needleDark = new THREE.MeshStandardMaterial({ color: 0x2f5934, roughness: 0.76 });
  const needleLight = new THREE.MeshStandardMaterial({ color: 0x427041, roughness: 0.72 });

  const trunk = buildCurvedBranch(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.08, 0.75, 0.05),
      new THREE.Vector3(0.06, 1.55, -0.04),
      new THREE.Vector3(0.02, 2.05, 0.0),
    ],
    0.15,
    0.09,
    barkMat,
    12,
    8,
  );
  group.add(trunk);

  const branchTargets: [number, number, number][] = [
    [-0.55, 2.32, 0.25],
    [0.58, 2.35, -0.22],
    [0.05, 2.4, 0.56],
    [-0.18, 2.38, -0.52],
  ];
  branchTargets.forEach(([bx, by, bz], idx) => {
    const b = buildCurvedBranch(
      [new THREE.Vector3(0.02, 1.88, 0), new THREE.Vector3(bx * 0.6, 2.15, bz * 0.6), new THREE.Vector3(bx, by, bz)],
      0.06,
      0.025,
      barkMat,
    );
    group.add(b);
    const pad = buildFoliageCluster(0.55, idx % 2 === 0 ? needleLight : needleDark, idx, 1.45, 0.42, 1.35);
    pad.position.set(bx, by + 0.14, bz);
    group.add(pad);
  });

  const topUmbrella = buildFoliageCluster(0.75, needleLight, 9, 1.45, 0.44, 1.45);
  topUmbrella.position.set(0, 2.55, 0);
  group.add(topUmbrella);
  return group;
}

// 4. ARCE JAPONÉS / CEREZO SAKURA / JACARANDA / MAGNOLIO
function buildOrnamentalTree(
  tintHex: string,
  style: 'maple' | 'sakura' | 'magnolia' | 'jacaranda',
): THREE.Group {
  const group = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({ map: getBarkTexture('brown'), color: 0x625045, roughness: 0.88 });
  const mainLeaf = new THREE.MeshStandardMaterial({ color: tintHex, roughness: 0.68 });
  const altColor = new THREE.Color(tintHex).offsetHSL(0.01, -0.05, 0.08);
  const hiLeaf = new THREE.MeshStandardMaterial({ color: altColor, roughness: 0.65 });

  // Sinuous multi-fork trunk
  const trunk = buildCurvedBranch(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.06, 0.45, -0.03),
      new THREE.Vector3(-0.04, 0.95, 0.04),
    ],
    0.1,
    0.065,
    barkMat,
  );
  group.add(trunk);

  const branches: [number, number, number, number][] = [
    [-0.5, 1.48, 0.25, 0.48],
    [0.52, 1.54, -0.18, 0.48],
    [-0.15, 1.65, -0.45, 0.44],
    [0.24, 1.44, 0.44, 0.44],
    [0.02, 1.88, 0.04, 0.54],
  ];

  branches.forEach(([x, y, z, r], i) => {
    const b = buildCurvedBranch(
      [new THREE.Vector3(-0.03, 0.9, 0.03), new THREE.Vector3(x * 0.55, 1.2, z * 0.55), new THREE.Vector3(x, y - 0.1, z)],
      0.045,
      0.018,
      barkMat,
    );
    group.add(b);

    const pad = buildFoliageCluster(
      r,
      i % 2 === 0 ? mainLeaf : hiLeaf,
      i * 2.2,
      1.3,
      style === 'maple' || style === 'sakura' ? 0.52 : 0.72,
      1.25,
    );
    pad.position.set(x, y + 0.06, z);
    group.add(pad);
  });

  if (style === 'magnolia') {
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xfbf7ef, roughness: 0.38 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.09, 6), petalMat);
      fl.rotation.x = Math.PI;
      fl.position.set(Math.cos(a) * 0.52, 1.55 + (i % 3) * 0.15, Math.sin(a) * 0.52);
      group.add(fl);
    }
  } else if (style === 'sakura') {
    // Fallen pink petals accent on ground around trunk
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xf9cddb, roughness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.2;
      const dist = 0.35 + (i % 3) * 0.22;
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.045, 6), petalMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(Math.cos(a) * dist, 0.025, Math.sin(a) * dist);
      group.add(p);
    }
  }

  return group;
}

// 5. ABEDUL MULTITRONCO (WHITE BIRCH)
function buildBirchTree(): THREE.Group {
  const group = new THREE.Group();
  const birchMat = new THREE.MeshStandardMaterial({
    map: getBarkTexture('birch'),
    color: 0xffffff,
    roughness: 0.78,
  });
  const leafLight = new THREE.MeshStandardMaterial({ color: 0x76a852, roughness: 0.68 });
  const leafMid = new THREE.MeshStandardMaterial({ color: 0x5c8e43, roughness: 0.74 });

  const stems: [number, number, number][] = [
    [-0.14, 2.35, 0.08],
    [0.16, 2.6, -0.05],
    [0.02, 2.15, -0.16],
  ];
  stems.forEach(([tx, ty, tz], i) => {
    const trunk = buildCurvedBranch(
      [
        new THREE.Vector3(tx * 0.2, 0, tz * 0.2),
        new THREE.Vector3(tx * 0.6, ty * 0.45, tz * 0.6),
        new THREE.Vector3(tx, ty, tz),
      ],
      0.06,
      0.022,
      birchMat,
      10,
      8,
    );
    group.add(trunk);

    for (let c = 0; c < 3; c++) {
      const a = c * 2.1 + i;
      const crown = buildFoliageCluster(0.36 - c * 0.04, c % 2 === 0 ? leafLight : leafMid, i + c, 1.1, 0.85, 1.1);
      crown.position.set(tx + Math.cos(a) * 0.22, ty - 0.15 + c * 0.22, tz + Math.sin(a) * 0.22);
      group.add(crown);
    }
  });
  return group;
}

// 6. SAUCE LLORÓN (WEEPING WILLOW)
function buildWillowTree(): THREE.Group {
  const group = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({ map: getBarkTexture('brown'), color: 0x5d4c3e, roughness: 0.92 });
  const willowMat = new THREE.MeshStandardMaterial({ color: 0x6c9652, roughness: 0.75 });
  const willowDark = new THREE.MeshStandardMaterial({ color: 0x527a3f, roughness: 0.8 });

  const trunk = buildCurvedBranch(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.05, 0.55, 0),
      new THREE.Vector3(-0.04, 1.25, 0.03),
    ],
    0.15,
    0.09,
    barkMat,
  );
  group.add(trunk);

  const topCrown = buildFoliageCluster(0.65, willowMat, 5, 1.2, 0.7, 1.2);
  topCrown.position.set(0, 1.9, 0);
  group.add(topCrown);

  // Arching boughs + hanging curtain strands
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rad = 0.58 + (i % 2) * 0.18;
    const sx = Math.cos(a) * rad;
    const sz = Math.sin(a) * rad;
    const strand = buildCurvedBranch(
      [
        new THREE.Vector3(sx * 0.45, 1.65, sz * 0.45),
        new THREE.Vector3(sx * 0.92, 1.45, sz * 0.92),
        new THREE.Vector3(sx, 0.65 + (i % 3) * 0.14, sz),
      ],
      0.09,
      0.035,
      i % 2 === 0 ? willowMat : willowDark,
      8,
      6,
    );
    group.add(strand);
  }
  return group;
}

// 7. CÍTRICO (NARANJO / LIMONERO)
function buildCitrusTree(isLemon: boolean): THREE.Group {
  const group = buildOrnamentalTree('#3B6E3C', 'magnolia');
  const fruitMat = new THREE.MeshStandardMaterial({
    color: isLemon ? 0xecd038 : 0xeb7b22,
    roughness: 0.34,
    metalness: 0.04,
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.4;
    const r = 0.38 + (i % 2) * 0.14;
    const fruit = new THREE.Mesh(
      isLemon ? new THREE.SphereGeometry(0.05, 8, 8) : new THREE.SphereGeometry(0.055, 8, 8),
      fruitMat,
    );
    if (isLemon) fruit.scale.set(1, 1.25, 1);
    fruit.position.set(Math.cos(a) * r, 1.38 + (i % 3) * 0.15, Math.sin(a) * r);
    group.add(fruit);
  }
  return group;
}

// 8. PALMERA WASHINGTONIA & PALMERA DATILERA
function buildPalmTree(isDatePalm = false): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ map: getBarkTexture('brown'), color: 0x7b6552, roughness: 0.92 });
  const frondMat = new THREE.MeshStandardMaterial({
    color: isDatePalm ? 0x4b7a44 : 0x548349,
    roughness: 0.62,
    side: THREE.DoubleSide,
  });

  const height = isDatePalm ? 2.5 : 2.8;
  const trunk = buildCurvedBranch(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.1, height * 0.35, 0.04),
      new THREE.Vector3(-0.05, height * 0.72, -0.02),
      new THREE.Vector3(0.02, height, 0),
    ],
    isDatePalm ? 0.18 : 0.14,
    isDatePalm ? 0.12 : 0.09,
    trunkMat,
    12,
    9,
  );
  group.add(trunk);

  const frondCount = isDatePalm ? 12 : 9;
  for (let i = 0; i < frondCount; i++) {
    const a = (i / frondCount) * Math.PI * 2;
    const tierY = i % 2 === 0 ? height : height - 0.1;
    const reach = isDatePalm ? 1.25 : 1.05;
    const spine = buildCurvedBranch(
      [
        new THREE.Vector3(0.02, tierY, 0),
        new THREE.Vector3(Math.cos(a) * reach * 0.55, tierY + 0.38, Math.sin(a) * reach * 0.55),
        new THREE.Vector3(Math.cos(a) * reach, tierY - 0.18, Math.sin(a) * reach),
      ],
      0.032,
      0.008,
      frondMat,
      7,
      5,
    );
    group.add(spine);

    // Leaf fan blade
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(isDatePalm ? 0.26 : 0.36, reach * 0.95, 5),
      frondMat,
    );
    blade.scale.set(1.1, 1, 0.12);
    blade.position.set(Math.cos(a) * reach * 0.58, tierY + 0.16, Math.sin(a) * reach * 0.58);
    blade.rotation.y = -a + Math.PI / 2;
    blade.rotation.x = Math.PI / 2.2;
    group.add(blade);
  }
  return group;
}

// 9. LAVANDA AROMÁTICA (DETAILED MULTI-SPIKE)
function buildLavenderShrub(): THREE.Group {
  const group = new THREE.Group();
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x6f856c, roughness: 0.86 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5f745c, roughness: 0.8 });
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0x7b5fb0, roughness: 0.58 });

  const base = buildFoliageCluster(0.26, foliageMat, 2, 1.15, 0.68, 1.15);
  base.position.y = 0.16;
  group.add(base);

  for (let i = 0; i < 16; i++) {
    const a = i * 2.39996;
    const r = 0.04 + Math.sqrt(i / 16) * 0.2;
    const h = 0.22 + (i % 3) * 0.05;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, h, 5), stemMat);
    stem.position.set(Math.cos(a) * r, 0.2 + h * 0.45, Math.sin(a) * r);
    stem.rotation.z = -Math.cos(a) * 0.24;
    stem.rotation.x = Math.sin(a) * 0.24;
    group.add(stem);

    const spike = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.09, 4, 6), spikeMat);
    spike.position.set(Math.cos(a) * (r + 0.03), 0.24 + h * 0.85, Math.sin(a) * (r + 0.03));
    spike.rotation.copy(stem.rotation);
    group.add(spike);
  }
  return group;
}

// 10. HORTENSIA & ROSAL CUPPED BLOOMS
function buildHydrangeaOrRose(tintHex: string, isRose: boolean): THREE.Group {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3b673c, roughness: 0.72 });
  const bloomColor = new THREE.Color(tintHex || (isRose ? '#E08FA3' : '#84A8D8'));
  const bloomMat = new THREE.MeshStandardMaterial({ color: bloomColor, roughness: 0.48 });
  const innerMat = new THREE.MeshStandardMaterial({
    color: bloomColor.clone().offsetHSL(0, 0.05, -0.1),
    roughness: 0.42,
  });

  const foliage = buildFoliageCluster(0.32, leafMat, 4, 1.15, 0.76, 1.15);
  foliage.position.y = 0.22;
  group.add(foliage);

  const count = isRose ? 8 : 5;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const rad = i === 0 ? 0.02 : 0.18 + (i % 2) * 0.05;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad;
    const by = isRose ? 0.4 + (i % 2) * 0.06 : 0.44 + (i % 2) * 0.05;

    if (isRose) {
      // Cupped multi-ring rose bloom
      const outerCup = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.038, 0.055, 8), bloomMat);
      outerCup.position.set(bx, by, bz);
      group.add(outerCup);
      const innerBud = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), innerMat);
      innerBud.position.set(bx, by + 0.015, bz);
      group.add(innerBud);
    } else {
      // Compound hydrangea corymb cluster
      for (let f = 0; f < 5; f++) {
        const fa = (f / 5) * Math.PI * 2;
        const fr = f === 0 ? 0 : 0.052;
        const floret = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), f % 2 === 0 ? bloomMat : innerMat);
        floret.position.set(bx + Math.cos(fa) * fr, by + (f === 0 ? 0.03 : 0), bz + Math.sin(fa) * fr);
        group.add(floret);
      }
    }
  }
  return group;
}

// 11. NEW FLOWER STYLES: TULIP, DAISY/SUNFLOWER, LILY/ORCHID, TROPICAL STRELITZIA, HANGING PETUNIA
function buildTulipCluster(tintHex: string): THREE.Group {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4c7c48, roughness: 0.62, side: THREE.DoubleSide });
  const cupMat = new THREE.MeshStandardMaterial({ color: tintHex || '#E07A68', roughness: 0.42, side: THREE.DoubleSide });
  const lathePts = [
    new THREE.Vector2(0.005, 0),
    new THREE.Vector2(0.042, 0.025),
    new THREE.Vector2(0.052, 0.075),
    new THREE.Vector2(0.038, 0.115),
  ];
  const cupGeo = new THREE.LatheGeometry(lathePts, 10);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = i === 0 ? 0.02 : 0.11;
    const h = 0.28 + (i % 3) * 0.05;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, h, 6), leafMat);
    stem.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    group.add(stem);

    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(Math.cos(a) * r, h - 0.01, Math.sin(a) * r);
    group.add(cup);

    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 4), leafMat);
    blade.scale.set(0.35, 1, 1);
    blade.position.set(Math.cos(a + 0.4) * (r + 0.03), 0.1, Math.sin(a + 0.4) * (r + 0.03));
    blade.rotation.z = -Math.cos(a + 0.4) * 0.35;
    group.add(blade);
  }
  return group;
}

function buildDaisyOrSunflower(tintHex: string, isSunflower: boolean): THREE.Group {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x45753d, roughness: 0.74 });
  const petalMat = new THREE.MeshStandardMaterial({
    color: tintHex || (isSunflower ? '#F2C12E' : '#F8F6F0'),
    roughness: 0.48,
    side: THREE.DoubleSide,
  });
  const centerMat = new THREE.MeshStandardMaterial({
    color: isSunflower ? 0x462d1b : 0xe5b126,
    roughness: 0.85,
  });

  const base = buildFoliageCluster(isSunflower ? 0.2 : 0.22, leafMat, 6, 1.2, 0.55, 1.2);
  base.position.y = 0.1;
  group.add(base);

  const heads = isSunflower ? 3 : 6;
  for (let i = 0; i < heads; i++) {
    const a = (i / heads) * Math.PI * 2;
    const r = i === 0 ? 0.02 : 0.12;
    const h = isSunflower ? 0.65 + (i % 2) * 0.18 : 0.28 + (i % 2) * 0.07;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(isSunflower ? 0.016 : 0.008, 0.018, h, 6), leafMat);
    stem.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    group.add(stem);

    const headGroup = new THREE.Group();
    headGroup.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    headGroup.rotation.x = isSunflower ? 0.45 : 0.25;
    headGroup.rotation.y = a;

    const discRadius = isSunflower ? 0.085 : 0.032;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(discRadius, discRadius * 0.85, 0.025, 12), centerMat);
    headGroup.add(disc);

    const petalCount = isSunflower ? 14 : 10;
    const pLen = isSunflower ? 0.09 : 0.048;
    for (let p = 0; p < petalCount; p++) {
      const pa = (p / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.BoxGeometry(pLen, 0.006, isSunflower ? 0.025 : 0.018), petalMat);
      petal.position.set(Math.cos(pa) * (discRadius + pLen * 0.42), 0, Math.sin(pa) * (discRadius + pLen * 0.42));
      petal.rotation.y = -pa;
      headGroup.add(petal);
    }
    group.add(headGroup);
  }
  return group;
}

function buildOrchidOrLily(tintHex: string, isOrchid: boolean): THREE.Group {
  const group = new THREE.Group();
  const potMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d6, roughness: 0.45 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x35643c, roughness: 0.48 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x456b3b, roughness: 0.65 });
  const bloomMat = new THREE.MeshStandardMaterial({ color: tintHex || '#F7F5F0', roughness: 0.35, side: THREE.DoubleSide });
  const lipMat = new THREE.MeshStandardMaterial({ color: isOrchid ? 0xd97ea4 : 0xe4c65b, roughness: 0.4 });

  if (isOrchid) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.16, 14), potMat);
    pot.position.y = 0.08;
    group.add(pot);
  }

  for (let l = 0; l < 4; l++) {
    const a = (l / 4) * Math.PI * 2 + 0.3;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.22), leafMat);
    leaf.position.set(Math.cos(a) * 0.09, isOrchid ? 0.18 : 0.08, Math.sin(a) * 0.09);
    leaf.rotation.y = -a;
    leaf.rotation.x = 0.3;
    group.add(leaf);
  }

  const spike = buildCurvedBranch(
    [
      new THREE.Vector3(0, isOrchid ? 0.15 : 0.05, 0),
      new THREE.Vector3(0.03, 0.38, 0.02),
      new THREE.Vector3(0.14, 0.56, 0.04),
    ],
    0.01,
    0.006,
    stemMat,
  );
  group.add(spike);

  const bloomSpots: [number, number, number][] = [
    [0.05, 0.42, 0.025],
    [0.1, 0.5, 0.035],
    [0.15, 0.56, 0.04],
    [0.01, 0.35, -0.02],
  ];
  bloomSpots.forEach(([bx, by, bz], idx) => {
    const fl = new THREE.Group();
    fl.position.set(bx, by, bz);
    fl.rotation.y = idx * 0.8;
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.036, 7), bloomMat);
      wing.position.set(Math.cos(pa) * 0.026, Math.sin(pa) * 0.026, 0);
      fl.add(wing);
    }
    const lip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), lipMat);
    lip.position.z = 0.012;
    fl.add(lip);
    group.add(fl);
  });

  return group;
}

function buildTropicalStrelitzia(): THREE.Group {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x316b44, roughness: 0.42, side: THREE.DoubleSide });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xef6c1e, roughness: 0.38 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2d4e9e, roughness: 0.38 });

  for (let i = 0; i < 6; i++) {
    const spread = (i - 2.5) * 0.22;
    const h = 0.65 + (i % 2) * 0.18;
    const petiole = buildCurvedBranch(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(spread * 0.6, h * 0.55, (i % 2 - 0.5) * 0.08), new THREE.Vector3(spread, h, 0)],
      0.014,
      0.009,
      leafMat,
    );
    group.add(petiole);

    const paddle = new THREE.Mesh(new THREE.CircleGeometry(0.14, 10), leafMat);
    paddle.scale.set(0.55, 1.85, 1);
    paddle.position.set(spread * 1.15, h + 0.14, (i % 2 - 0.5) * 0.05);
    paddle.rotation.z = -spread * 0.45;
    group.add(paddle);
  }

  // Crane-like orange & blue blossoms
  for (let f = 0; f < 3; f++) {
    const fx = (f - 1) * 0.16;
    const fy = 0.88 + (f % 2) * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, fy, 6), leafMat);
    stem.position.set(fx * 0.5, fy / 2, 0.05);
    stem.rotation.z = -fx * 0.25;
    group.add(stem);

    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 5), orangeMat);
    crest.rotation.z = -Math.PI / 2.8;
    crest.position.set(fx * 0.7 + 0.05, fy + 0.03, 0.05);
    group.add(crest);

    const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 4), blueMat);
    tongue.rotation.z = -Math.PI / 2;
    tongue.position.set(fx * 0.7 + 0.07, fy + 0.01, 0.05);
    group.add(tongue);
  }
  return group;
}

function buildHangingFlowerBasket(tintHex: string): THREE.Group {
  const group = new THREE.Group();
  const potMat = new THREE.MeshStandardMaterial({ color: 0xb86b4b, roughness: 0.75 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f703f, roughness: 0.7 });
  const bloomMat = new THREE.MeshStandardMaterial({ color: tintHex || '#8C4BB8', roughness: 0.45 });

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.22, 16), potMat);
  bowl.position.y = 0.11;
  group.add(bowl);

  const mound = buildFoliageCluster(0.24, leafMat, 7, 1.25, 0.65, 1.25);
  mound.position.y = 0.24;
  group.add(mound);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rad = i < 5 ? 0.12 : 0.24;
    const y = i < 5 ? 0.34 : 0.22;
    const bloom = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.045, 6), bloomMat);
    bloom.rotation.x = i < 5 ? Math.PI : Math.PI * 0.75;
    bloom.rotation.y = a;
    bloom.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
    group.add(bloom);
  }
  return group;
}

function buildBoxwoodOrAromatic(tintHex: string): THREE.Group {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c4738, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: tintHex || 0x3c6840, roughness: 0.78 });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 8), stemMat);
  stem.position.y = 0.08;
  group.add(stem);

  const ball = buildFoliageCluster(0.28, leafMat, 11, 1.0, 1.0, 1.0);
  ball.position.y = 0.34;
  group.add(ball);
  return group;
}

function buildMonsteraOrFern(tintHex: string): THREE.Group {
  const group = new THREE.Group();
  const potMat = new THREE.MeshStandardMaterial({ color: 0xbf7453, roughness: 0.76 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: tintHex || 0x356e48,
    roughness: 0.42,
    side: THREE.DoubleSide,
  });

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.26, 16), potMat);
  pot.position.y = 0.13;
  group.add(pot);

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const petiole = buildCurvedBranch(
      [new THREE.Vector3(0, 0.22, 0), new THREE.Vector3(Math.cos(a) * 0.18, 0.45 + (i % 2) * 0.1, Math.sin(a) * 0.18)],
      0.012,
      0.008,
      leafMat,
    );
    group.add(petiole);

    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.21, 9), leafMat);
    leaf.scale.set(0.82, 1.32, 1);
    leaf.position.set(Math.cos(a) * 0.24, 0.46 + (i % 2) * 0.1, Math.sin(a) * 0.24);
    leaf.rotation.set(-0.92, a, 0);
    group.add(leaf);
  }
  return group;
}

function buildTerracottaPot(isArchitectural: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: isArchitectural ? 0x9c9890 : 0xb86b4b,
    roughness: isArchitectural ? 0.85 : 0.72,
  });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2e22, roughness: 0.95 });

  if (isArchitectural) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 0.45), mat);
    box.position.y = 0.24;
    group.add(box);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.37), soilMat);
    soil.position.y = 0.47;
    group.add(soil);
  } else {
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.18, 0),
      new THREE.Vector2(0.26, 0.42),
      new THREE.Vector2(0.29, 0.48),
      new THREE.Vector2(0.25, 0.48),
      new THREE.Vector2(0.22, 0.42),
    ];
    const pot = new THREE.Mesh(new THREE.LatheGeometry(points, 20), mat);
    group.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 16), soilMat);
    soil.position.y = 0.41;
    group.add(soil);
  }
  return group;
}

function buildPergola(): THREE.Group {
  const group = new THREE.Group();
  const woodTex = getBarkTexture('wood');
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.72, metalness: 0.05 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2c302e, roughness: 0.35, metalness: 0.78 });

  const w = 3.4;
  const d = 2.6;
  const h = 2.4;

  const postOffsets: [number, number][] = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ];
  postOffsets.forEach(([x, z]) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), metalMat);
    base.position.set(x, 0.04, z);
    group.add(base);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), woodMat);
    post.position.set(x, h / 2, z);
    group.add(post);
  });

  const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.26, 0.16, 0.12), woodMat);
  frontBeam.position.set(0, h, d / 2);
  const backBeam = frontBeam.clone();
  backBeam.position.set(0, h, -d / 2);
  group.add(frontBeam, backBeam);

  for (let i = -4; i <= 4; i++) {
    const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.12, d + 0.28), woodMat);
    rafter.position.set((i / 4) * (w / 2), h + 0.09, 0);
    group.add(rafter);
  }
  return group;
}

function buildPool(isBalinese = false): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: isBalinese ? 0x454946 : 0xded5c6,
    roughness: isBalinese ? 0.84 : 0.76,
    metalness: 0.04,
  });
  const basinMat = new THREE.MeshStandardMaterial({
    color: isBalinese ? 0x175343 : 0x1d5b68,
    roughness: 0.42,
  });
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: isBalinese ? 0x2c8f76 : 0x3ea6ba,
    normalMap: getWaterRippleTexture(),
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.07,
    metalness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.85,
  });

  const w = 4.8;
  const d = 2.6;
  const coping = new THREE.Mesh(new THREE.BoxGeometry(w + 0.44, 0.11, d + 0.44), stoneMat);
  coping.position.y = 0.055;
  group.add(coping);

  const basin = new THREE.Mesh(new THREE.BoxGeometry(w, 0.115, d), basinMat);
  basin.position.y = 0.058;
  group.add(basin);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, d - 0.08), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.125;
  group.add(water);

  if (isBalinese) {
    const teakMat = new THREE.MeshStandardMaterial({
      map: getBarkTexture('wood'),
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.04,
    });
    // Teak sun deck alongside the pool
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.44, 0.09, 1.05), teakMat);
    deck.position.set(0, 0.045, d / 2 + 0.74);
    group.add(deck);

    // Balinese gazebo daybed at the end of the teak deck
    const gx = -w / 2 + 0.85;
    const gz = d / 2 + 0.72;
    const gw = 1.45;
    const gd = 1.15;
    const gh = 1.65;

    const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(gw, 0.18, gd), teakMat);
    baseFrame.position.set(gx, 0.18, gz);
    group.add(baseFrame);

    const linenMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.92 });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(gw - 0.12, 0.12, gd - 0.12), linenMat);
    mattress.position.set(gx, 0.32, gz);
    group.add(mattress);

    const posts: [number, number][] = [
      [gx - gw / 2 + 0.06, gz - gd / 2 + 0.06],
      [gx + gw / 2 - 0.06, gz - gd / 2 + 0.06],
      [gx - gw / 2 + 0.06, gz + gd / 2 - 0.06],
      [gx + gw / 2 - 0.06, gz + gd / 2 - 0.06],
    ];
    posts.forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, gh, 8), teakMat);
      post.position.set(px, 0.15 + gh / 2, pz);
      group.add(post);

      // Draped white linen corner curtain
      const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, gh * 0.82, 8), linenMat);
      curtain.position.set(px, 0.25 + (gh * 0.82) / 2, pz);
      group.add(curtain);
    });

    // Hipped thatch roof
    const thatchMat = new THREE.MeshStandardMaterial({ color: 0x7c6343, roughness: 0.94 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.18, 0.55, 4), thatchMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(gx, 0.15 + gh + 0.25, gz);
    group.add(roof);
  }
  return group;
}

function buildGardenBench(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: getBarkTexture('wood'), color: 0xffffff, roughness: 0.68 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2f3431, roughness: 0.4, metalness: 0.75 });

  for (let s = 0; s < 3; s++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.045, 0.14), woodMat);
    slat.position.set(0, 0.42, -0.15 + s * 0.15);
    group.add(slat);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.05), woodMat);
  back.position.set(0, 0.66, -0.21);
  back.rotation.x = -0.15;

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.44), legMat);
  legL.position.set(-0.62, 0.21, 0);
  const legR = legL.clone();
  legR.position.set(0.62, 0.21, 0);

  group.add(back, legL, legR);
  return group;
}

function buildGardenLight(): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2d3230, roughness: 0.38, metalness: 0.78 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffe8b6,
    emissive: 0xffc663,
    emissiveIntensity: 1.5,
    roughness: 0.28,
  });

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.52, 12), bodyMat);
  post.position.y = 0.26;
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 12), glowMat);
  lamp.position.y = 0.54;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12), bodyMat);
  cap.position.y = 0.61;
  group.add(post, lamp, cap);
  return group;
}

function buildRusticFireplace(): THREE.Group {
  const group = new THREE.Group();
  const stoneMainMat = new THREE.MeshStandardMaterial({ color: 0x7a7368, roughness: 0.92, metalness: 0.04 });
  const stoneAltMat = new THREE.MeshStandardMaterial({ color: 0x625b52, roughness: 0.94, metalness: 0.02 });
  const timberMat = new THREE.MeshStandardMaterial({ map: getBarkTexture('wood'), color: 0x82593b, roughness: 0.78 });
  const fireboxMat = new THREE.MeshStandardMaterial({ color: 0x1d1a18, roughness: 0.95 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xff6b1a,
    emissive: 0xff5a12,
    emissiveIntensity: 2.1,
    roughness: 0.4,
  });

  // Raised flagstone hearth
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, 1.05), stoneAltMat);
  hearth.position.set(0, 0.07, 0.12);
  group.add(hearth);

  // Main stacked fieldstone firebox surround
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.28, 0.34), stoneMainMat);
  backWall.position.set(0, 0.72, -0.22);
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.18, 0.56), stoneMainMat);
  leftPillar.position.set(-0.6, 0.68, 0.08);
  const rightPillar = leftPillar.clone();
  rightPillar.position.x = 0.6;
  const fireboxBack = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.85, 0.18), fireboxMat);
  fireboxBack.position.set(0, 0.55, -0.02);
  group.add(backWall, leftPillar, rightPillar, fireboxBack);

  // Reclaimed oak timber mantel beam
  const mantel = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.16, 0.64), timberMat);
  mantel.position.set(0, 1.24, 0.06);
  group.add(mantel);

  // Tapered fieldstone chimney stack + slate cap
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.78, 0.72, 4), stoneMainMat);
  hood.rotation.y = Math.PI / 4;
  hood.position.set(0, 1.66, -0.02);
  const flue = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.48), stoneAltMat);
  flue.position.set(0, 2.26, -0.04);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.64), stoneMainMat);
  chimneyCap.position.set(0, 2.62, -0.04);
  group.add(hood, flue, chimneyCap);

  // Glowing logs & warm fire core
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.44, 7), timberMat);
    log.rotation.z = Math.PI / 2 + (i - 1) * 0.14;
    log.rotation.y = (i - 1) * 0.32;
    log.position.set(0, 0.22 + i * 0.04, 0.1);
    group.add(log);
  }
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 7), emberMat);
  flameCore.position.set(0, 0.36, 0.12);
  const flameSide = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 6), emberMat);
  flameSide.position.set(-0.11, 0.31, 0.11);
  flameSide.rotation.z = 0.22;
  group.add(flameCore, flameSide);

  return group;
}

export function buildProceduralElementGroup(
  el: DesignElement,
  _isSelected = false,
): THREE.Group {
  const preset: ModelPreset = el.modelPreset;
  let inner: THREE.Group;

  switch (preset) {
    case 'olive_tree':
      inner = buildOliveTree(el.colorHex, false);
      break;
    case 'olive_bonsai_tree':
      inner = buildOliveTree(el.colorHex, true);
      break;
    case 'cypress_tree':
      inner = buildCypressTree();
      break;
    case 'pine_tree':
      inner = buildPineTree();
      break;
    case 'maple_tree':
      inner = buildOrnamentalTree(el.colorHex || '#8E3538', 'maple');
      break;
    case 'sakura_tree':
      inner = buildOrnamentalTree(el.colorHex || '#F3B7C8', 'sakura');
      break;
    case 'jacaranda_tree':
      inner = buildOrnamentalTree(el.colorHex || '#7D6BC2', 'jacaranda');
      break;
    case 'willow_tree':
      inner = buildWillowTree();
      break;
    case 'birch_tree':
      inner = buildBirchTree();
      break;
    case 'magnolia_tree':
      inner = buildOrnamentalTree(el.colorHex || '#34583B', 'magnolia');
      break;
    case 'citrus_tree':
      inner = buildCitrusTree(el.name.toLowerCase().includes('limon'));
      break;
    case 'palm_tree':
      inner = buildPalmTree(false);
      break;
    case 'date_palm_tree':
      inner = buildPalmTree(true);
      break;
    case 'lavender_shrub':
      inner = buildLavenderShrub();
      break;
    case 'hydrangea_shrub':
      inner = buildHydrangeaOrRose(el.colorHex || '#84A8D8', false);
      break;
    case 'rose_bush':
    case 'flower_rose':
    case 'flower_cluster':
      inner = buildHydrangeaOrRose(el.colorHex || '#E08FA3', true);
      break;
    case 'flower_tulip':
      inner = buildTulipCluster(el.colorHex);
      break;
    case 'flower_daisy':
      inner = buildDaisyOrSunflower(el.colorHex, false);
      break;
    case 'flower_sunflower':
      inner = buildDaisyOrSunflower(el.colorHex, true);
      break;
    case 'flower_lily':
      inner = buildOrchidOrLily(el.colorHex, false);
      break;
    case 'flower_orchid':
      inner = buildOrchidOrLily(el.colorHex, true);
      break;
    case 'flower_tropical':
      inner = buildTropicalStrelitzia();
      break;
    case 'flower_hanging':
      inner = buildHangingFlowerBasket(el.colorHex);
      break;
    case 'boxwood_shrub':
    case 'aromatic_shrub':
      inner = buildBoxwoodOrAromatic(el.colorHex);
      break;
    case 'monstera_plant':
    case 'fern_plant':
    case 'succulent_plant':
      inner = buildMonsteraOrFern(el.colorHex);
      break;
    case 'terracotta_pot':
      inner = buildTerracottaPot(false);
      break;
    case 'architectural_planter':
      inner = buildTerracottaPot(true);
      break;
    case 'pergola':
      inner = buildPergola();
      break;
    case 'pool':
      inner = buildPool(false);
      break;
    case 'balinese_pool':
      inner = buildPool(true);
      break;
    case 'rustic_fireplace':
      inner = buildRusticFireplace();
      break;
    case 'garden_bench':
      inner = buildGardenBench();
      break;
    case 'garden_light':
      inner = buildGardenLight();
      break;
    default: {
      inner = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.6),
        new THREE.MeshStandardMaterial({ color: el.colorHex || '#A7B9A0', roughness: 0.7 }),
      );
      mesh.position.y = 0.25;
      inner.add(mesh);
      break;
    }
  }

  enableShadows(inner);

  const root = new THREE.Group();
  root.add(inner);

  if (el.model3dUrl) {
    const cached = loadedGltfCache.get(el.model3dUrl);
    if (cached) {
      root.clear();
      const clone = cached.clone();
      enableShadows(clone);
      root.add(clone);
    } else {
      gltfLoader.load(
        el.model3dUrl,
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z, 0.01);
          const scaleFactor = 1.4 / maxDim;
          model.scale.setScalar(scaleFactor);
          const newBox = new THREE.Box3().setFromObject(model);
          model.position.y -= newBox.min.y;
          loadedGltfCache.set(el.model3dUrl!, model);
          root.clear();
          const clone = model.clone();
          enableShadows(clone);
          root.add(clone);
        },
        undefined,
        () => {},
      );
    }
  }

  // Soft feathered radial contact shadow disc
  const shadowSize = Math.max(0.75, Math.min(2.6, (el.widthM || 0.8) * 0.95));
  const shadowDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowSize, shadowSize),
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.014;
  root.add(shadowDisc);

  root.position.set(el.position.x, el.position.y, el.position.z);
  root.rotation.y = el.rotationY;
  root.scale.setScalar(el.scale || 1);
  root.userData.elementId = el.id;
  return root;
}

export function buildSurfaceMesh(
  surf: DesignSurface,
  isSelected: boolean,
  maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  if (surf.points.length < 3) return group;

  const shape = new THREE.Shape();
  shape.moveTo(surf.points[0].x, -surf.points[0].z);
  for (let i = 1; i < surf.points.length; i++) {
    shape.lineTo(surf.points[i].x, -surf.points[i].z);
  }
  shape.closePath();

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  extrudeGeo.rotateX(-Math.PI / 2);

  const texKind =
    surf.materialType === 'cesped_natural' || surf.materialType === 'cesped_artificial'
      ? 'grass'
      : surf.materialType === 'grava'
        ? 'gravel'
        : surf.materialType === 'corteza'
          ? 'bark'
          : surf.materialType === 'camino'
            ? 'path'
            : 'bed';

  const tex = createProceduralSurfaceTexture(texKind, maxAnisotropy);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    color: texKind === 'grass' ? 0xffffff : new THREE.Color(surf.colorHex || '#ffffff'),
    roughness: texKind === 'path' ? 0.68 : 0.9,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(extrudeGeo, mat);
  mesh.position.y = 0.014;
  mesh.receiveShadow = true;
  mesh.userData.surfaceId = surf.id;
  group.add(mesh);

  // Realistic 3D Corten steel edging perimeter when enabled
  if (surf.includeEdging) {
    const cortenMat = new THREE.MeshStandardMaterial({
      color: 0x8c4a2f,
      roughness: 0.65,
      metalness: 0.45,
    });
    for (let i = 0; i < surf.points.length; i++) {
      const p1 = surf.points[i];
      const p2 = surf.points[(i + 1) % surf.points.length];
      const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      if (len < 0.05) continue;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.025), cortenMat);
      strip.position.set((p1.x + p2.x) / 2, 0.045, (p1.z + p2.z) / 2);
      strip.rotation.y = -Math.atan2(p2.z - p1.z, p2.x - p1.x);
      strip.castShadow = true;
      group.add(strip);
    }
  }

  if (isSelected) {
    const linePoints = [
      ...surf.points.map((p) => new THREE.Vector3(p.x, 0.068, p.z)),
      new THREE.Vector3(surf.points[0].x, 0.068, surf.points[0].z),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x183d32, linewidth: 2 });
    group.add(new THREE.Line(lineGeo, lineMat));
  }

  group.userData.surfaceId = surf.id;
  return group;
}
