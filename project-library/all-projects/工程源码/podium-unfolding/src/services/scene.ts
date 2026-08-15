import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FaceName, LayoutMode, PodiumBlockSpec, Transform, ViewMode } from "../core/types";
import { flatTransform, interpolateTransform, separatedTransform, solidTransform } from "./layout";

const faceNames: readonly FaceName[] = ["front", "back", "left", "right", "top", "bottom"];

interface FaceObject {
  face: FaceName;
  block: PodiumBlockSpec;
  group: THREE.Group;
}

interface ActiveAnimation {
  startedAt: number;
  duration: number;
  entries: Array<{ group: THREE.Group; from: Transform; to: Transform }>;
}

const cameraViews: Record<ViewMode, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  front: { position: new THREE.Vector3(0, 2.45, 8.8), target: new THREE.Vector3(0, 1.15, 0) },
  top: { position: new THREE.Vector3(0, 9.4, 0.01), target: new THREE.Vector3(0, 0, 0) },
  perspective: { position: new THREE.Vector3(6.3, 4.7, 7.2), target: new THREE.Vector3(0, 1.05, 0) },
};

export class PodiumScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private readonly faces: FaceObject[] = [];
  private animation?: ActiveAnimation;
  private frameId = 0;

  constructor(private readonly host: HTMLElement, blocks: readonly PodiumBlockSpec[]) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "可拖拽旋转的三维领奖台与展开图");
    this.host.append(this.renderer.domElement);

    this.camera.position.copy(cameraViews.perspective.position);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(cameraViews.perspective.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minDistance = 4.6;
    this.controls.maxDistance = 14;
    this.controls.maxPolarAngle = Math.PI / 2.02;

    this.buildEnvironment();
    blocks.forEach((block) => this.buildBlock(block));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    this.render();
  }

  setLayout(mode: LayoutMode): void {
    const entries = this.faces.map(({ block, face, group }) => ({
      group,
      from: { position: group.position.clone(), quaternion: group.quaternion.clone() },
      to: this.targetFor(mode, block, face),
    }));
    this.animation = { startedAt: performance.now(), duration: 850, entries };
    this.controls.maxPolarAngle = mode === "solid" ? Math.PI / 2.02 : Math.PI / 2;
  }

  setView(mode: ViewMode): void {
    const view = cameraViews[mode];
    const cameraStart = this.camera.position.clone();
    const targetStart = this.controls.target.clone();
    const startedAt = performance.now();
    const animateCamera = (now: number): void => {
      const progress = Math.min((now - startedAt) / 650, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.camera.position.lerpVectors(cameraStart, view.position, eased);
      this.controls.target.lerpVectors(targetStart, view.target, eased);
      if (progress < 1) requestAnimationFrame(animateCamera);
    };
    requestAnimationFrame(animateCamera);
  }

  reset(): void {
    this.setLayout("solid");
    this.setView("perspective");
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }

  private buildEnvironment(): void {
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0xeaf0f6, 10, 20);

    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x8a9bb0, 2.2);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    this.scene.add(key);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8.5, 80),
      new THREE.ShadowMaterial({ color: 0x17324f, opacity: 0.12 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const rings = new THREE.RingGeometry(4.8, 4.83, 96);
    const ring = new THREE.Mesh(rings, new THREE.MeshBasicMaterial({ color: 0xc8d5e2, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    this.scene.add(ring);
  }

  private buildBlock(block: PodiumBlockSpec): void {
    faceNames.forEach((face) => {
      const dimensions = this.faceDimensions(block, face);
      const group = new THREE.Group();
      const geometry = new THREE.PlaneGeometry(dimensions.width, dimensions.height);
      const color = this.faceColor(face);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02, side: THREE.DoubleSide });
      const panel = new THREE.Mesh(geometry, material);
      panel.castShadow = true;
      panel.receiveShadow = true;
      group.add(panel);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x8d3528, transparent: true, opacity: 0.55 })
      );
      edge.position.z = 0.004;
      group.add(edge);

      if (face === "front") group.add(this.makeNumber(block.place, dimensions.width, dimensions.height));

      const initial = solidTransform(block, face);
      group.position.copy(initial.position);
      group.quaternion.copy(initial.quaternion);
      this.scene.add(group);
      this.faces.push({ face, block, group });
    });
  }

  private makeNumber(place: number, width: number, height: number): THREE.Mesh {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.clearRect(0, 0, 256, 256);
    context.fillStyle = "#17324f";
    context.font = "800 146px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(place), 128, 140);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(width * 0.56, 0.78), Math.min(height * 0.56, 0.78)),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    label.position.z = 0.012;
    return label;
  }

  private targetFor(mode: LayoutMode, block: PodiumBlockSpec, face: FaceName): Transform {
    if (mode === "solid") return solidTransform(block, face);
    if (mode === "flat") return flatTransform(block, face);
    if (mode === "separated") return separatedTransform(block, face);
    return interpolateTransform(solidTransform(block, face), flatTransform(block, face), 0.48);
  }

  private faceDimensions(block: PodiumBlockSpec, face: FaceName): { width: number; height: number } {
    if (face === "front" || face === "back") return { width: block.width, height: block.height };
    if (face === "left" || face === "right") return { width: block.depth, height: block.height };
    return { width: block.width, height: block.depth };
  }

  private faceColor(face: FaceName): number {
    if (face === "front") return 0xf5c84b;
    if (face === "back" || face === "bottom") return 0xffdf83;
    if (face === "top") return 0xd94d37;
    return 0xee7451;
  }

  private resize(): void {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private render = (): void => {
    this.frameId = requestAnimationFrame(this.render);
    if (this.animation) {
      const progress = Math.min((performance.now() - this.animation.startedAt) / this.animation.duration, 1);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      this.animation.entries.forEach(({ group, from, to }) => {
        group.position.lerpVectors(from.position, to.position, eased);
        group.quaternion.slerpQuaternions(from.quaternion, to.quaternion, eased);
      });
      if (progress >= 1) this.animation = undefined;
    }
    this.controls.update(this.clock.getDelta());
    this.renderer.render(this.scene, this.camera);
  };
}
