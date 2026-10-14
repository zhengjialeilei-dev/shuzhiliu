import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FaceName, LayoutMode, PodiumBlockSpec, Transform, ViewMode } from "../core/types";
import { flatTransform, interpolateTransform, separatedTransform, solidTransform, unfoldingTransform } from "./layout";

const faceNames: readonly FaceName[] = ["front", "back", "left", "right", "top", "bottom"];

interface FaceObject {
  face: FaceName;
  block: PodiumBlockSpec;
  group: THREE.Group;
}

interface ActiveAnimation {
  startedAt: number;
  duration: number;
  fromOpen: number;
  toOpen: number;
  fromSeparate: number;
  toSeparate: number;
}

export class PodiumScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private readonly faces: FaceObject[] = [];
  private animation?: ActiveAnimation;
  private cameraAnimation?: { startedAt: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 };
  private mode: LayoutMode = "solid";
  private view: ViewMode = "perspective";
  private openness = 0;
  private separation = 0;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private frameId = 0;

  constructor(private readonly host: HTMLElement, blocks: readonly PodiumBlockSpec[]) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "可拖拽旋转的三维领奖台与展开图");
    this.host.append(this.renderer.domElement);

    this.camera.position.set(6.3, 4.7, 7.2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI / 2.02;
    this.controls.addEventListener("start", () => { this.cameraAnimation = undefined; });

    this.buildEnvironment();
    blocks.forEach((block) => this.buildBlock(block));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    this.render();
  }

  setLayout(mode: LayoutMode): void {
    this.mode = mode;
    this.animation = {
      startedAt: performance.now(), duration: this.reducedMotion ? 1 : 1200,
      fromOpen: this.openness, toOpen: mode === "solid" ? 0 : mode === "half" ? 0.65 : 1,
      fromSeparate: this.separation, toSeparate: mode === "separated" ? 1 : 0,
    };
    this.controls.maxPolarAngle = mode === "solid" ? Math.PI / 2.02 : Math.PI / 2;
    this.fitView(true);
  }

  setView(mode: ViewMode): void {
    this.view = mode;
    this.fitView(true);
  }

  reset(): void {
    this.setLayout("solid");
    this.setView("perspective");
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if ("map" in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        });
      }
    });
    this.renderer.dispose();
  }

  private buildEnvironment(): void {
    this.scene.background = null;

    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x8a9bb0, 2.2);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.04;
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
      // Thin, double-sided panels must not shadow themselves (visible stripes).
      panel.receiveShadow = false;
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
    return unfoldingTransform(block, face, 0.65);
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
    this.fitView(false);
  }

  private fitView(animated: boolean): void {
    const points: THREE.Vector3[] = [];
    this.faces.forEach(({ block, face }) => {
      const pose = this.targetFor(this.mode, block, face);
      const { width, height } = this.faceDimensions(block, face);
      for (const x of [-width / 2, width / 2]) for (const y of [-height / 2, height / 2]) {
        points.push(new THREE.Vector3(x, y, 0).applyQuaternion(pose.quaternion).add(pose.position));
      }
    });
    const target = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
    // A flat net viewed exactly edge-on disappears: retain a small elevation.
    const direction = (this.view === "top" ? new THREE.Vector3(0, 1, 0.001)
      : this.view === "front" ? new THREE.Vector3(0, this.mode === "solid" ? 0.08 : 0.85, 1)
      : new THREE.Vector3(0.65, 0.85, 1)).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tanY = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const tanX = tanY * this.camera.aspect;
    let distance = 3;
    points.forEach((point) => {
      const relative = point.clone().sub(target);
      distance = Math.max(distance, relative.dot(direction) + Math.max(Math.abs(relative.dot(right)) / tanX, Math.abs(relative.dot(up)) / tanY) * 1.25);
    });
    const position = target.clone().addScaledVector(direction, distance);
    if (animated && !this.reducedMotion) {
      this.cameraAnimation = { startedAt: performance.now(), from: this.camera.position.clone(), to: position, fromTarget: this.controls.target.clone(), toTarget: target };
    } else {
      this.cameraAnimation = undefined;
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
    }
  }

  private render = (): void => {
    this.frameId = requestAnimationFrame(this.render);
    if (this.animation) {
      const progress = Math.min((performance.now() - this.animation.startedAt) / this.animation.duration, 1);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      this.openness = THREE.MathUtils.lerp(this.animation.fromOpen, this.animation.toOpen, eased);
      this.separation = THREE.MathUtils.lerp(this.animation.fromSeparate, this.animation.toSeparate, eased);
      this.faces.forEach(({ group, block, face }) => {
        const pose = interpolateTransform(unfoldingTransform(block, face, this.openness), separatedTransform(block, face), this.separation);
        group.position.copy(pose.position);
        group.quaternion.copy(pose.quaternion);
      });
      if (progress >= 1) this.animation = undefined;
    }
    if (this.cameraAnimation) {
      const camera = this.cameraAnimation;
      const progress = Math.min((performance.now() - camera.startedAt) / 650, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.camera.position.lerpVectors(camera.from, camera.to, eased);
      this.controls.target.lerpVectors(camera.fromTarget, camera.toTarget, eased);
      if (progress >= 1) this.cameraAnimation = undefined;
    }
    this.controls.update(this.clock.getDelta());
    this.renderer.render(this.scene, this.camera);
  };
}
