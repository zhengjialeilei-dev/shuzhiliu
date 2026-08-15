import type { PanoramaMountOptions, PanoramaViewer } from "./panorama";

export class LazyPanoramaViewer implements PanoramaViewer {
  private delegate?: PanoramaViewer;
  private disposed = false;

  async mount(options: PanoramaMountOptions): Promise<void> {
    this.disposed = false;
    const { ThreePanoramaViewer } = await import("./panorama");
    if (this.disposed) return;

    this.delegate = new ThreePanoramaViewer();
    await this.delegate.mount(options);
  }

  dispose(): void {
    this.disposed = true;
    this.delegate?.dispose();
    this.delegate = undefined;
  }
}
