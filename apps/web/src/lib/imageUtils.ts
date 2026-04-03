/**
 * 图片压缩与格式转换工具
 * - 转换为 WebP 格式（更小体积，现代浏览器支持好）
 * - 压缩到指定宽度（默认 640px）
 * - 质量可调（默认 0.85）
 */

export interface CompressOptions {
  maxWidth?: number;
  quality?: number;
  format?: 'webp' | 'jpeg';
}

/**
 * 将图片文件压缩并转换为 WebP 格式
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的 Blob 和文件名
 */
export const compressImage = (
  file: File,
  options: CompressOptions = {}
): Promise<{ blob: Blob; fileName: string }> => {
  const { maxWidth = 640, quality = 0.85, format = 'webp' } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not supported'));
      return;
    }

    img.onload = () => {
      // 计算目标尺寸，保持宽高比
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // 使用高质量插值
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为 WebP/JPEG
      const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // 生成新文件名
          const randomStr = Math.random().toString(36).substring(2, 8);
          const fileName = `${Date.now()}_${randomStr}.${format}`;

          resolve({ blob, fileName });
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // 从文件创建 URL
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 检查浏览器是否支持 WebP
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

