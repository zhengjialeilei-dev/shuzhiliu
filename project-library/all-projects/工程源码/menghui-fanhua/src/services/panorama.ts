import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface PanoramaMountOptions {
  readonly container: HTMLElement;
  readonly imageUrl: string;
  readonly onReady?: () => void;
  readonly onError?: (error: unknown) => void;
}

export interface PanoramaViewer {
  mount(options: PanoramaMountOptions): Promise<void>;
  dispose(): void;
}

export type PanoramaViewerFactory = () => PanoramaViewer;

export class ThreePanoramaViewer implements PanoramaViewer {
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private geometry?: THREE.SphereGeometry;
  private material?: THREE.MeshBasicMaterial;
  private texture?: THREE.Texture;
  private resizeObserver?: ResizeObserver;
  private container?: HTMLElement;

  async mount(options: PanoramaMountOptions): Promise<void> {
    this.dispose();
    this.container = options.container;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11100e);

    const camera = new THREE.PerspectiveCamera(
      88,
      Math.max(options.container.clientWidth, 1) /
        Math.max(options.container.clientHeight, 1),
      0.1,
      1000,
    );
    camera.position.set(0, 0, 0.1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    options.container.replaceChildren(this.renderer.domElement);

    this.controls = new OrbitControls(camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.75;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 0.5;

    try {
      this.texture = await new THREE.TextureLoader().loadAsync(options.imageUrl);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.wrapS = THREE.RepeatWrapping;
      this.texture.repeat.x = -1;
      this.texture.offset.x = 1;

      this.geometry = new THREE.SphereGeometry(500, 64, 40);
      this.material = new THREE.MeshBasicMaterial({
        map: this.texture,
        side: THREE.BackSide,
      });
      scene.add(new THREE.Mesh(this.geometry, this.material));

      const resize = (): void => {
        if (!this.renderer || !this.container) return;
        const width = Math.max(this.container.clientWidth, 1);
        const height = Math.max(this.container.clientHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
      };

      this.resizeObserver = new ResizeObserver(resize);
      this.resizeObserver.observe(options.container);
      resize();

      this.renderer.setAnimationLoop(() => {
        this.controls?.update();
        this.renderer?.render(scene, camera);
      });
      options.onReady?.();
    } catch (error) {
      options.onError?.(error);
      this.dispose();
    }
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.renderer?.setAnimationLoop(null);
    this.controls?.dispose();
    this.geometry?.dispose();
    this.material?.dispose();
    this.texture?.dispose();
    this.renderer?.dispose();
    this.container?.replaceChildren();

    this.renderer = undefined;
    this.controls = undefined;
    this.geometry = undefined;
    this.material = undefined;
    this.texture = undefined;
    this.resizeObserver = undefined;
    this.container = undefined;
  }
}
