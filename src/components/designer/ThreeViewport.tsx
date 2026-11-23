import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useViverdeStore } from '../../store/useViverdeStore';
import {
  buildProceduralElementGroup,
  buildSurfaceMesh,
  createProceduralSurfaceTexture,
  disposeObject3D,
} from '../../three/proceduralModels';
import { DesignElement } from '../../types/viverde';
import { getRectPoints } from '../../utils/calculations';

interface ThreeViewportProps {
  onRegisterCapture?: (fn: () => string | null) => void;
}

function elementVisualSignature(el: DesignElement): string {
  return `${el.productId}|${el.modelPreset}|${el.model3dUrl || ''}|${el.colorHex}|${el.name}`;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({ onRegisterCapture }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  const {
    activeProject,
    selectedElementId,
    selectedSurfaceId,
    cameraPreset,
    cameraNonce,
    zoomDelta,
    timeOfDay,
    growthYears,
    pendingPlacementProductId,
    products,
    activeCompanyId,
  } = useViverdeStore();

  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    terrainGroup: THREE.Group;
    surfacesGroup: THREE.Group;
    elementsGroup: THREE.Group;
    nightLightsGroup: THREE.Group;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    rimLight: THREE.DirectionalLight;
    skyMat: THREE.ShaderMaterial;
    selectionRing: THREE.Mesh;
    elementMap: Map<string, { group: THREE.Group; sig: string }>;
    requestRender: () => void;
    targetCamPos: THREE.Vector3 | null;
    targetLookAt: THREE.Vector3 | null;
  } | null>(null);

  const dragStateRef = useRef<{
    active: boolean;
    elementId: string | null;
    lastX: number;
    lastZ: number;
  }>({ active: false, elementId: null, lastX: 0, lastZ: 0 });

  const prevZoomRef = useRef(zoomDelta);

  // Initialize Three.js WebGLRenderer once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 800, container.clientHeight || 520);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeae7dd);
    scene.fog = new THREE.FogExp2(0xeae7dd, 0.0085);

    // Procedural Sky Dome with warm Mediterranean horizon gradient
    const skyGeo = new THREE.SphereGeometry(120, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0xc5dce8) },
        horizonColor: { value: new THREE.Color(0xf2efe6) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          float t = clamp(pow(max(h, 0.0), 0.65), 0.0, 1.0);
          gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
        }
      `,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      44,
      (container.clientWidth || 800) / (container.clientHeight || 520),
      0.1,
      240,
    );
    camera.position.set(11.5, 9.2, 13.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.075;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 2.5;
    controls.maxDistance = 48;
    controls.target.set(0, 0.5, 0);

    // Balanced outdoor architectural lighting (warm key sun + cool sky hemisphere + subtle rim)
    const hemiLight = new THREE.HemisphereLight(0xd9ecf9, 0x80725b, 0.82);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.72);
    sunLight.position.set(15, 24, 13);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = isSoftwareGl ? 1024 : 2048;
    sunLight.shadow.mapSize.height = isSoftwareGl ? 1024 : 2048;
    sunLight.shadow.camera.left = -18;
    sunLight.shadow.camera.right = 18;
    sunLight.shadow.camera.top = 18;
    sunLight.shadow.camera.bottom = -18;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xd2e5dc, 0.42);
    rimLight.position.set(-14, 9, -15);
    scene.add(rimLight);

    // Extended surrounding landscape ground + subtle rolling hills
    const outerGround = new THREE.Mesh(
      new THREE.CircleGeometry(110, 48),
      new THREE.MeshStandardMaterial({ color: 0xd9dfd0, roughness: 0.96, metalness: 0 }),
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.025;
    outerGround.receiveShadow = true;
    scene.add(outerGround);

    const distantMoundMat = new THREE.MeshStandardMaterial({ color: 0xc2ceb7, roughness: 0.95 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const dist = 34 + (i % 3) * 8;
      const mound = new THREE.Mesh(new THREE.SphereGeometry(6 + (i % 3) * 2.5, 14, 8), distantMoundMat);
      mound.scale.set(1.8, 0.25, 1.4);
      mound.position.set(Math.cos(a) * dist, -0.3, Math.sin(a) * dist);
      scene.add(mound);
    }

    const terrainGroup = new THREE.Group();
    const surfacesGroup = new THREE.Group();
    const elementsGroup = new THREE.Group();
    const nightLightsGroup = new THREE.Group();
    scene.add(terrainGroup, surfacesGroup, elementsGroup, nightLightsGroup);

    // Reusable selection highlight ring
    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.67, 36),
      new THREE.MeshBasicMaterial({ color: 0x183d32, side: THREE.DoubleSide }),
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.032;
    selectionRing.visible = false;
    scene.add(selectionRing);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const now = performance.now();
        const delta = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        const state = sceneObjectsRef.current;
        let animatingCam = false;
        if (state?.targetCamPos && state?.targetLookAt) {
          const factor = 1 - Math.exp(-8 * delta);
          camera.position.lerp(state.targetCamPos, factor);
          controls.target.lerp(state.targetLookAt, factor);
          if (
            camera.position.distanceTo(state.targetCamPos) < 0.04 &&
            controls.target.distanceTo(state.targetLookAt) < 0.04
          ) {
            camera.position.copy(state.targetCamPos);
            controls.target.copy(state.targetLookAt);
            state.targetCamPos = null;
            state.targetLookAt = null;
          } else {
            animatingCam = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || animatingCam) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    sceneObjectsRef.current = {
      scene,
      camera,
      renderer,
      controls,
      terrainGroup,
      surfacesGroup,
      elementsGroup,
      nightLightsGroup,
      sunLight,
      hemiLight,
      rimLight,
      skyMat,
      selectionRing,
      elementMap: new Map(),
      requestRender,
      targetCamPos: null,
      targetLookAt: null,
    };

    const handleControlsChange = () => requestRender();
    const handleControlsStart = () => {
      if (sceneObjectsRef.current) {
        sceneObjectsRef.current.targetCamPos = null;
        sceneObjectsRef.current.targetLookAt = null;
      }
    };
    controls.addEventListener('change', handleControlsChange);
    controls.addEventListener('start', handleControlsStart);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const hitPoint = new THREE.Vector3();
    const xzPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const updateMouse = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findElementIdFromObject = (obj: THREE.Object3D | null): string | null => {
      let cur: THREE.Object3D | null = obj;
      while (cur) {
        if (cur.userData?.elementId) return String(cur.userData.elementId);
        cur = cur.parent;
      }
      return null;
    };

    const findSurfaceIdFromObject = (obj: THREE.Object3D | null): string | null => {
      let cur: THREE.Object3D | null = obj;
      while (cur) {
        if (cur.userData?.surfaceId) return String(cur.userData.surfaceId);
        cur = cur.parent;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      updateMouse(e);
      raycaster.setFromCamera(mouse, camera);

      const store = useViverdeStore.getState();

      if (store.pendingPlacementProductId) {
        if (raycaster.ray.intersectPlane(xzPlane, hitPoint)) {
          const prod = store.products.find(
            (p) => p.id === store.pendingPlacementProductId && p.companyId === store.activeCompanyId,
          );
          if (prod) {
            const hw = store.activeProject.widthM / 2;
            const hl = store.activeProject.lengthM / 2;
            store.addElementToDesign(
              prod,
              {
                x: Number(Math.max(-hw, Math.min(hw, hitPoint.x)).toFixed(2)),
                z: Number(Math.max(-hl, Math.min(hl, hitPoint.z)).toFixed(2)),
              },
              1,
            );
          }
        }
        return;
      }

      const elHits = raycaster.intersectObjects(elementsGroup.children, true);
      if (elHits.length > 0) {
        const elId = findElementIdFromObject(elHits[0].object);
        if (elId) {
          const el = store.activeProject.elements.find((item) => item.id === elId);
          store.pushUndoSnapshot();
          store.selectElement(elId);
          dragStateRef.current = {
            active: true,
            elementId: elId,
            lastX: el?.position.x ?? 0,
            lastZ: el?.position.z ?? 0,
          };
          controls.enabled = false;
          requestRender();
          return;
        }
      }

      const surfHits = raycaster.intersectObjects(surfacesGroup.children, true);
      if (surfHits.length > 0) {
        const surfId = findSurfaceIdFromObject(surfHits[0].object);
        if (surfId) {
          store.selectSurface(surfId);
          requestRender();
          return;
        }
      }

      store.selectElement(null);
      store.selectSurface(null);
      requestRender();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.active || !dragStateRef.current.elementId) return;
      const ctx = sceneObjectsRef.current;
      if (!ctx) return;

      updateMouse(e);
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.ray.intersectPlane(xzPlane, hitPoint)) {
        const store = useViverdeStore.getState();
        const hw = store.activeProject.widthM / 2;
        const hl = store.activeProject.lengthM / 2;
        const cx = Number(Math.max(-hw, Math.min(hw, hitPoint.x)).toFixed(2));
        const cz = Number(Math.max(-hl, Math.min(hl, hitPoint.z)).toFixed(2));
        dragStateRef.current.lastX = cx;
        dragStateRef.current.lastZ = cz;

        // Move group directly in-place at 60fps without triggering React/mesh rebuilds
        const entry = ctx.elementMap.get(dragStateRef.current.elementId);
        if (entry) {
          entry.group.position.set(cx, 0, cz);
          ctx.selectionRing.position.set(cx, 0.032, cz);
          ctx.requestRender();
        }
      }
    };

    const onPointerUp = () => {
      if (dragStateRef.current.active && dragStateRef.current.elementId) {
        const { elementId, lastX, lastZ } = dragStateRef.current;
        dragStateRef.current = { active: false, elementId: null, lastX: 0, lastZ: 0 };
        controls.enabled = true;
        useViverdeStore.getState().updateElement(elementId, {
          position: { x: lastX, y: 0, z: lastZ },
        });
        requestRender();
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      updateMouse(e as unknown as PointerEvent);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(elementsGroup.children, true);
      if (hits.length > 0) {
        const elId = findElementIdFromObject(hits[0].object);
        const ctx = sceneObjectsRef.current;
        if (elId && ctx) {
          const entry = ctx.elementMap.get(elId);
          if (entry) {
            const pos = entry.group.position;
            ctx.targetLookAt = new THREE.Vector3(pos.x, 0.8, pos.z);
            ctx.targetCamPos = new THREE.Vector3(pos.x + 3.2, 2.6, pos.z + 3.8);
            ctx.requestRender();
          }
        }
      }
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError(true);
    };
    canvasEl.addEventListener('webglcontextlost', handleContextLost);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    if (onRegisterCapture) {
      onRegisterCapture(() => {
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      });
    }

    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', handleControlsChange);
      controls.removeEventListener('start', handleControlsStart);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      disposeObject3D(scene);
      controls.dispose();
      renderer.dispose();
      sceneObjectsRef.current = null;
    };
  }, [onRegisterCapture]);

  // 1. Rebuild terrain ONLY when dimensions change
  useEffect(() => {
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;

    const { terrainGroup, renderer, requestRender } = ctx;
    disposeObject3D(terrainGroup);
    terrainGroup.clear();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const w = activeProject.widthM;
    const l = activeProject.lengthM;

    const soilTex = createProceduralSurfaceTexture('soil', maxAniso).clone();
    soilTex.repeat.set(w / 2.2, l / 2.2);
    soilTex.needsUpdate = true;

    const plotBase = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, l),
      new THREE.MeshStandardMaterial({
        map: soilTex,
        color: 0xc5b89e,
        roughness: 0.94,
        metalness: 0.02,
      }),
    );
    plotBase.position.y = -0.04;
    plotBase.receiveShadow = true;
    terrainGroup.add(plotBase);

    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.09, l));
    const borderMat = new THREE.LineBasicMaterial({ color: 0x183d32 });
    const borderLines = new THREE.LineSegments(borderGeo, borderMat);
    borderLines.position.y = -0.03;
    terrainGroup.add(borderLines);

    const grid = new THREE.GridHelper(Math.max(w, l), Math.round(Math.max(w, l)), 0x183d32, 0xa7b9a0);
    grid.position.y = 0.005;
    (grid.material as THREE.Material).opacity = 0.16;
    (grid.material as THREE.Material).transparent = true;
    terrainGroup.add(grid);

    requestRender();
  }, [activeProject.widthM, activeProject.lengthM]);

  // 2. Rebuild surfaces ONLY when surfaces or selectedSurfaceId change
  useEffect(() => {
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;

    const { surfacesGroup, renderer, requestRender } = ctx;
    disposeObject3D(surfacesGroup);
    surfacesGroup.clear();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    for (const surf of activeProject.surfaces) {
      surfacesGroup.add(buildSurfaceMesh(surf, selectedSurfaceId === surf.id, maxAniso));
    }

    requestRender();
  }, [activeProject.surfaces, selectedSurfaceId]);

  // 3. Incrementally diff elements (no full rebuild on move/scale/rotate/select!)
  useEffect(() => {
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;

    const { elementsGroup, elementMap, selectionRing, requestRender } = ctx;
    const activeIds = new Set(activeProject.elements.map((e) => e.id));

    // Remove deleted elements
    for (const [id, entry] of elementMap.entries()) {
      if (!activeIds.has(id)) {
        elementsGroup.remove(entry.group);
        disposeObject3D(entry.group);
        elementMap.delete(id);
      }
    }

    // Add or update elements
    for (const el of activeProject.elements) {
      const sig = elementVisualSignature(el);
      const existing = elementMap.get(el.id);

      const growthFactor =
        el.category === 'arboles'
          ? growthYears === 5
            ? 1.46
            : growthYears === 3
              ? 1.24
              : 1
          : el.category === 'arbustos' || el.category === 'plantas' || el.category === 'flores'
            ? growthYears === 5
              ? 1.28
              : growthYears === 3
                ? 1.15
                : 1
            : 1;
      const effScale = (el.scale || 1) * growthFactor;

      if (!existing || existing.sig !== sig) {
        if (existing) {
          elementsGroup.remove(existing.group);
          disposeObject3D(existing.group);
        }
        const group = buildProceduralElementGroup(el, false);
        group.scale.setScalar(effScale);
        elementsGroup.add(group);
        elementMap.set(el.id, { group, sig });
      } else {
        existing.group.position.set(el.position.x, el.position.y, el.position.z);
        existing.group.rotation.y = el.rotationY;
        existing.group.scale.setScalar(effScale);
      }
    }

    // Update lightweight selection ring
    if (selectedElementId) {
      const selEl = activeProject.elements.find((e) => e.id === selectedElementId);
      if (selEl) {
        const ringScale = Math.max(0.85, (selEl.widthM || 1) * 0.65 * (selEl.scale || 1));
        selectionRing.position.set(selEl.position.x, 0.034, selEl.position.z);
        selectionRing.scale.setScalar(ringScale);
        selectionRing.visible = true;
      } else {
        selectionRing.visible = false;
      }
    } else {
      selectionRing.visible = false;
    }

    requestRender();
  }, [activeProject.elements, selectedElementId, growthYears]);

  // 4. Solar time-of-day & nocturnal garden lights simulation
  useEffect(() => {
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;

    const {
      scene,
      renderer,
      sunLight,
      hemiLight,
      rimLight,
      skyMat,
      nightLightsGroup,
      requestRender,
    } = ctx;

    nightLightsGroup.clear();

    if (timeOfDay === 'morning') {
      sunLight.position.set(-16, 13, 14);
      sunLight.color.setHex(0xfff1d2);
      sunLight.intensity = 1.48;
      hemiLight.color.setHex(0xd6ecfc);
      hemiLight.groundColor.setHex(0x887a62);
      hemiLight.intensity = 0.85;
      rimLight.intensity = 0.45;
      skyMat.uniforms.topColor.value.setHex(0xb8d7ea);
      skyMat.uniforms.horizonColor.value.setHex(0xf4eee0);
      scene.background = new THREE.Color(0xebe6da);
      (scene.fog as THREE.FogExp2).color.setHex(0xebe6da);
      renderer.toneMappingExposure = 1.05;
    } else if (timeOfDay === 'sunset') {
      sunLight.position.set(18, 7.5, -11);
      sunLight.color.setHex(0xffb16e);
      sunLight.intensity = 1.38;
      hemiLight.color.setHex(0xf2bfa0);
      hemiLight.groundColor.setHex(0x5e4d41);
      hemiLight.intensity = 0.68;
      rimLight.intensity = 0.36;
      skyMat.uniforms.topColor.value.setHex(0x6e85a8);
      skyMat.uniforms.horizonColor.value.setHex(0xf3bf8c);
      scene.background = new THREE.Color(0xe3bf9a);
      (scene.fog as THREE.FogExp2).color.setHex(0xe3bf9a);
      renderer.toneMappingExposure = 1.0;
    } else if (timeOfDay === 'night') {
      sunLight.position.set(-10, 20, -10);
      sunLight.color.setHex(0x88a9d6);
      sunLight.intensity = 0.34;
      hemiLight.color.setHex(0x283d5e);
      hemiLight.groundColor.setHex(0x161b18);
      hemiLight.intensity = 0.45;
      rimLight.intensity = 0.22;
      skyMat.uniforms.topColor.value.setHex(0x09111e);
      skyMat.uniforms.horizonColor.value.setHex(0x1b2b3d);
      scene.background = new THREE.Color(0x141f2e);
      (scene.fog as THREE.FogExp2).color.setHex(0x141f2e);
      renderer.toneMappingExposure = 1.12;

      // Add warm 2700K point lights to garden_light bollards and subtle pool glow
      let lightBudget = 0;
      for (const el of activeProject.elements) {
        if (lightBudget >= 10) break;
        if (el.modelPreset === 'garden_light') {
          const pLight = new THREE.PointLight(0xffcb7d, 2.2, 5.2, 1.8);
          pLight.position.set(el.position.x, 0.56 * (el.scale || 1), el.position.z);
          nightLightsGroup.add(pLight);
          lightBudget++;
        } else if (el.modelPreset === 'pool' || el.modelPreset === 'balinese_pool') {
          const poolGlow = new THREE.PointLight(0x3ad6b4, 2.6, 6.5, 1.6);
          poolGlow.position.set(el.position.x, 0.35, el.position.z);
          nightLightsGroup.add(poolGlow);
          lightBudget++;
        } else if (el.modelPreset === 'pergola') {
          const pergLight = new THREE.PointLight(0xffd79b, 1.8, 5.5, 1.8);
          pergLight.position.set(el.position.x, 2.1, el.position.z);
          nightLightsGroup.add(pergLight);
          lightBudget++;
        } else if (el.modelPreset === 'rustic_fireplace') {
          const fireLight = new THREE.PointLight(0xff8433, 3.0, 7.0, 1.6);
          fireLight.position.set(el.position.x, 0.55, el.position.z + 0.35);
          nightLightsGroup.add(fireLight);
          lightBudget++;
        }
      }
    } else {
      // Midday default
      sunLight.position.set(15, 24, 13);
      sunLight.color.setHex(0xfff1d6);
      sunLight.intensity = 1.72;
      hemiLight.color.setHex(0xd9ecf9);
      hemiLight.groundColor.setHex(0x80725b);
      hemiLight.intensity = 0.82;
      rimLight.intensity = 0.42;
      skyMat.uniforms.topColor.value.setHex(0xc5dce8);
      skyMat.uniforms.horizonColor.value.setHex(0xf2efe6);
      scene.background = new THREE.Color(0xeae7dd);
      (scene.fog as THREE.FogExp2).color.setHex(0xeae7dd);
      renderer.toneMappingExposure = 1.08;
    }

    requestRender();
  }, [timeOfDay, activeProject.elements]);

  // Camera Presets
  useEffect(() => {
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;
    const span = Math.max(activeProject.widthM, activeProject.lengthM);
    if (cameraPreset === 'top') {
      ctx.targetCamPos = new THREE.Vector3(0, span * 1.35, 0.01);
      ctx.targetLookAt = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'front') {
      ctx.targetCamPos = new THREE.Vector3(0, 3.2, span * 1.15);
      ctx.targetLookAt = new THREE.Vector3(0, 1.0, 0);
    } else {
      ctx.targetCamPos = new THREE.Vector3(span * 0.92, span * 0.78, span * 1.05);
      ctx.targetLookAt = new THREE.Vector3(0, 0.4, 0);
    }
    ctx.requestRender();
  }, [cameraPreset, cameraNonce, activeProject.widthM, activeProject.lengthM]);

  // Zoom button triggers
  useEffect(() => {
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;
    const diff = zoomDelta - prevZoomRef.current;
    prevZoomRef.current = zoomDelta;
    if (diff === 0) return;

    const dir = new THREE.Vector3().subVectors(ctx.camera.position, ctx.controls.target);
    const dist = dir.length();
    const nextDist = Math.max(2.5, Math.min(48, dist * (diff > 0 ? 0.84 : 1.18)));
    dir.normalize().multiplyScalar(nextDist);
    ctx.camera.position.copy(ctx.controls.target).add(dir);
    ctx.requestRender();
  }, [zoomDelta]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const ctx = sceneObjectsRef.current;
    if (!ctx) return;
    const productId = e.dataTransfer.getData('application/viverde-product-id');
    if (!productId) return;
    const prod = products.find((p) => p.id === productId && p.companyId === activeCompanyId);
    if (!prod) return;

    const rect = ctx.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, ctx.camera);
    const hit = new THREE.Vector3();
    const xzPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (raycaster.ray.intersectPlane(xzPlane, hit)) {
      const hw = activeProject.widthM / 2;
      const hl = activeProject.lengthM / 2;
      const px = Number(Math.max(-hw, Math.min(hw, hit.x)).toFixed(2));
      const pz = Number(Math.max(-hl, Math.min(hl, hit.z)).toFixed(2));
      const store = useViverdeStore.getState();
      if (prod.unit === 'm2') {
        store.addSurfaceToDesign({
          product: prod,
          points: getRectPoints(px, pz, 3, 3),
          shapeType: 'rect',
        });
      } else {
        store.addElementToDesign(prod, { x: px, z: pz }, 1);
      }
    }
  };

  if (webglError) {
    return (
      <div className="w-full h-full bg-[#EAE5D8] flex flex-col items-center justify-center p-6 text-center">
        <p className="font-display text-xl text-[#183D32] mb-2">
          WebGL no disponible en este navegador
        </p>
        <p className="text-sm text-[#303632]/75 max-w-md">
          Puedes seguir diseñando con total precisión en la Vista 2D y generar tu presupuesto automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#EAE7DD]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal non-occluding HUD hint */}
      <div className="absolute bottom-3 left-3 z-10 bg-[#FFFFFF]/95 border border-[#303632]/15 rounded-lg px-3 py-1.5 text-[11px] font-mono text-[#303632] pointer-events-none">
        {pendingPlacementProductId
          ? 'Haz clic sobre el terreno 3D para colocar el elemento'
          : 'Vista 3D · Arrastra para rotar · Doble clic para enfocar · Arrastra cualquier planta para moverla'}
      </div>
    </div>
  );
};
