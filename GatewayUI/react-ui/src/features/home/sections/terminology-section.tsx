import React, { useRef, useState, useEffect } from 'react';

const CLOUD_BASE = 'https://res.cloudinary.com/danmkw7ni/image/upload';
const VIDEO_WEBM = 'https://res.cloudinary.com/danmkw7ni/image/upload/f_webm,q_auto';
const VIDEO_MP4 = 'https://res.cloudinary.com/danmkw7ni/image/upload/f_mp4,q_auto';

interface GifPos {
  top: string;
  left: string;
  width: string;
  height: string;
}

interface TermItem {
  title: string;
  videoSrc: string; // base path (without format extension)
  arrowsUrl: string; // arrows-only overlay (transparent PNG)
  gifPos: GifPos; // video overlay position as % of arrows image
  hasAlpha: boolean; // source has real transparency
}

const TERMS: TermItem[] = [
  {
    title: 'Packed particles',
    videoSrc: 'v1787325296/section3_gif1_yhwxnd.gif',
    arrowsUrl: `${CLOUD_BASE}/f_auto,q_auto/v1787333483/section3_arrows1_y9cbpw.png`,
    gifPos: { top: 'calc(19% + 7px)', left: '32.5%', width: '57%', height: '77%' },
    hasAlpha: false,
  },
  {
    title: 'Void space',
    videoSrc: 'v1787325296/section3_gif2_rcvgmi.webp',
    arrowsUrl: `${CLOUD_BASE}/f_auto,q_auto/v1787333483/section3_arrows3_d2nzks.png`,
    gifPos: { top: 'calc(29% - 20px)', left: 'calc(39% - 67.5px)', width: '73.5%', height: '74.5%' },
    hasAlpha: false,
  },
  {
    title: 'Pore',
    videoSrc: 'v1787325296/section3_gif3_rdboz4.gif',
    arrowsUrl: `${CLOUD_BASE}/f_auto,q_auto/v1787333483/section3_arrows2_xiclwo.png`,
    gifPos: { top: 'calc(19% + 10px)', left: 'calc(16% - 6px)', width: '67%', height: '76%' },
    hasAlpha: true,
  },
];

const FADE_MS = 500;

const TermCard: React.FC<{ term: TermItem }> = ({ term }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const tryPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      // Retry once after a short delay if autoplay is blocked
      setTimeout(() => v.play().catch(() => {}), 500);
    });
  };

  // Video ended — last frame stays visible, fade in arrows and stop.
  const onVideoEnded = () => {
    setShowArrows(true);
  };

  // Start playback when the card enters the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Reset and play once each time it enters view
          const v = videoRef.current;
          if (v) {
            v.currentTime = 0;
            setShowArrows(false);
            clearTimers();
          }
          tryPlay();
        } else {
          // Pause and reset when scrolled away
          const v = videoRef.current;
          if (v) {
            v.pause();
            v.currentTime = 0;
          }
          setShowArrows(false);
          clearTimers();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimers();
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center text-center flex-shrink-0">
      <div className="relative">
        {/* Arrows overlay (transparent PNG) - fades in/out over video's last frame */}
        <img
          src={term.arrowsUrl}
          alt={`${term.title} labels`}
          className="h-80 w-auto relative z-10 transition-opacity pointer-events-none"
          style={{ opacity: showArrows ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        />
        {/* Video always visible, positioned to match content area */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          onEnded={onVideoEnded}
          className="absolute"
          style={{
            top: term.gifPos.top,
            left: term.gifPos.left,
            width: term.gifPos.width,
            height: term.gifPos.height,
            objectFit: 'contain',
            ...(term.hasAlpha ? {} : { mixBlendMode: 'multiply' as const }),
          }}
        >
          {term.hasAlpha ? (
            <>
              <source src={`${VIDEO_WEBM}/${term.videoSrc}`} type="video/webm" />
              <source src={`${VIDEO_MP4}/${term.videoSrc}`} type="video/mp4" />
            </>
          ) : (
            <>
              <source src={`${VIDEO_WEBM},b_white/${term.videoSrc}`} type="video/webm" />
              <source src={`${VIDEO_MP4},b_white/${term.videoSrc}`} type="video/mp4" />
            </>
          )}
        </video>
      </div>
    </div>
  );
};

const TerminologySection: React.FC = () => {
  return (
    <section
      id="terminology"
      className="py-20 px-4"
      style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8F5F4 100%)' }}
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="section-heading flex flex-col items-center">
          <span className="heading-gradient pb-2">A brief background for</span>
          <span className="heading-gradient">context</span>
        </h2>
        <p className="section-subheading">
          Different terminology gets tossed around. Below are some common synonyms
        </p>

        <div className="flex flex-col xl:flex-row items-center justify-center gap-8">
          {TERMS.map((term) => (
            <TermCard key={term.title} term={term} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TerminologySection;
