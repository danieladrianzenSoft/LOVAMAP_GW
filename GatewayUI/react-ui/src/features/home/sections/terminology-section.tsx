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
  hasAlpha: boolean; // true = serve as native GIF (preserves transparency in all browsers)
  gifDurationMs?: number; // required when hasAlpha=true (GIF has no onEnded event)
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
    gifDurationMs: 5000,
  },
];

const FADE_MS = 500;
const NEAR_END_OFFSET = 0; // seconds before end to trigger next card

const TermCard: React.FC<{
  term: TermItem;
  play: boolean;
  onNearEnd: () => void;
}> = ({ term, play, onNearEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showArrows, setShowArrows] = useState(false);
  const timerRef = useRef<number | null>(null);
  const arrowTimerRef = useRef<number | null>(null);
  const nearEndFiredRef = useRef(false);
  const onNearEndRef = useRef(onNearEnd);
  onNearEndRef.current = onNearEnd;
  const [gifKey, setGifKey] = useState(0);

  const clearTimers = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (arrowTimerRef.current) { clearTimeout(arrowTimerRef.current); arrowTimerRef.current = null; }
  };

  useEffect(() => {
    nearEndFiredRef.current = false;

    if (play) {
      setShowArrows(false);

      if (term.hasAlpha) {
        const dur = term.gifDurationMs ?? 5000;
        const offset = Math.min(NEAR_END_OFFSET * 1000, dur);
        setGifKey(k => k + 1);
        timerRef.current = window.setTimeout(() => {
          onNearEndRef.current();
        }, dur - offset);
        arrowTimerRef.current = window.setTimeout(() => {
          setShowArrows(true);
        }, dur);
      } else {
        const v = videoRef.current;
        if (v) {
          v.currentTime = 0;
          v.play().catch(() => {
            setTimeout(() => v.play().catch(() => {}), 500);
          });
        }
      }
    } else {
      if (!term.hasAlpha) {
        const v = videoRef.current;
        if (v) { v.pause(); v.currentTime = 0; }
      }
      setShowArrows(false);
      clearTimers();
    }

    return () => clearTimers();
  }, [play]);

  // Preload GIF so there's no delay when it's time to play
  useEffect(() => {
    if (term.hasAlpha) {
      const img = new Image();
      img.src = `${CLOUD_BASE}/${term.videoSrc}`;
    }
  }, []);

  const onTimeUpdate = () => {
    if (nearEndFiredRef.current) return;
    const v = videoRef.current;
    if (!v || !v.duration) return;
    if (v.currentTime >= v.duration - NEAR_END_OFFSET) {
      nearEndFiredRef.current = true;
      onNearEndRef.current();
    }
  };

  const onVideoEnded = () => {
    setShowArrows(true);
  };

  return (
    <div className="flex flex-col items-center text-center flex-shrink-0">
      <div className="relative">
        {/* Arrows overlay (transparent PNG) - fades in/out */}
        <img
          src={term.arrowsUrl}
          alt={`${term.title} labels`}
          className="h-80 w-auto relative z-10 transition-opacity pointer-events-none"
          style={{ opacity: showArrows ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        />

        {term.hasAlpha ? (
          <>
            {/* Static first frame — always visible as base layer */}
            <img
              src={`${CLOUD_BASE}/pg_1,f_auto,q_auto/${term.videoSrc}`}
              alt={term.title}
              className="absolute"
              style={{
                top: term.gifPos.top,
                left: term.gifPos.left,
                width: term.gifPos.width,
                height: term.gifPos.height,
                objectFit: 'contain',
              }}
            />
            {/* Animated GIF — layered on top when playing, key forces restart */}
            {play && (
              <img
                key={gifKey}
                src={`${CLOUD_BASE}/${term.videoSrc}`}
                alt=""
                className="absolute"
                style={{
                  top: term.gifPos.top,
                  left: term.gifPos.left,
                  width: term.gifPos.width,
                  height: term.gifPos.height,
                  objectFit: 'contain',
                }}
              />
            )}
          </>
        ) : (
          /* Video with white bg + multiply blend */
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            onEnded={onVideoEnded}
            onTimeUpdate={onTimeUpdate}
            className="absolute"
            style={{
              top: term.gifPos.top,
              left: term.gifPos.left,
              width: term.gifPos.width,
              height: term.gifPos.height,
              objectFit: 'contain',
              mixBlendMode: 'multiply' as const,
            }}
          >
            <source src={`${VIDEO_WEBM},b_white/${term.videoSrc}`} type="video/webm" />
            <source src={`${VIDEO_MP4},b_white/${term.videoSrc}`} type="video/mp4" />
          </video>
        )}
      </div>
    </div>
  );
};

const TerminologySection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveIndex(0);
        } else {
          setActiveIndex(-1);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="terminology"
      className="py-20 px-4"
      style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8F5F4 100%)' }}
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="section-heading flex flex-col items-center">
          <span className="heading-gradient pb-2">A brief background</span>
          <span className="heading-gradient">for context</span>
        </h2>
        <p className="section-subheading">
          Different terminology gets tossed around. Below are some common synonyms
        </p>

        <div className="flex flex-col xl:flex-row items-center justify-center gap-8">
          {TERMS.map((term, i) => (
            <TermCard
              key={term.title}
              term={term}
              play={activeIndex >= i}
              onNearEnd={() => {
                setActiveIndex(prev => Math.max(prev, i + 1));
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TerminologySection;
