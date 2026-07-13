import { useEffect, useRef, useState } from 'react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export default function ProgressiveImage({
  src,
  alt,
  className = '',
  priority = false,
}: ProgressiveImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [shouldLoad, setShouldLoad] = useState(
    priority || typeof IntersectionObserver === 'undefined'
  );
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (priority || shouldLoad) return undefined;

    const image = imageRef.current;
    if (!image || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: '500px 0px' }
    );

    observer.observe(image);
    return () => observer.disconnect();
  }, [priority, shouldLoad]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-emerald-50 transition-opacity duration-300 ${
          loaded && !failed ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs font-medium text-slate-400">
          {alt}
        </div>
      ) : null}
      <img
        ref={imageRef}
        src={shouldLoad ? src : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${className} transition-opacity duration-300 ${loaded && !failed ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}
