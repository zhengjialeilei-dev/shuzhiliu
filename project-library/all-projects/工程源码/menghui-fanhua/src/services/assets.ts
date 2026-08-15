export interface AssetLoadResult {
  readonly loaded: number;
  readonly failed: readonly string[];
}

export interface AssetPreloader {
  preload(
    urls: readonly string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<AssetLoadResult>;
}

export class BrowserImagePreloader implements AssetPreloader {
  async preload(
    urls: readonly string[],
    onProgress: (completed: number, total: number) => void = () => undefined,
  ): Promise<AssetLoadResult> {
    const uniqueUrls = [...new Set(urls)];
    let completed = 0;
    const failed: string[] = [];

    await Promise.all(
      uniqueUrls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            const finish = (success: boolean): void => {
              completed += 1;
              if (!success) failed.push(url);
              onProgress(completed, uniqueUrls.length);
              resolve();
            };
            image.onload = () => finish(true);
            image.onerror = () => finish(false);
            image.src = url;
          }),
      ),
    );

    return { loaded: uniqueUrls.length - failed.length, failed };
  }
}
