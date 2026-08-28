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
  arrowEarlyS?: number; // override ARROW_EARLY_S per card
  delayAfterMs?: number; // override BETWEEN_DELAY_MS for the gap *after* this card
  multiply?: boolean; // true = apply mixBlendMode multiply (for GIFs with white bg)
}

const TERMS: TermItem[] = [
  {
    title: 'Packed particles',
    videoSrc: 'v1787325296/section3_gif1_yhwxnd.gif',
    arrowsUrl: `${CLOUD_BASE}/f_auto,q_auto/v1787333483/section3_arrows1_y9cbpw.png`,
    gifPos: { top: 'calc(19% + 3px)', left: '32.5%', width: '57%', height: '77%' },
    hasAlpha: true,
    gifDurationMs: 4600,
    multiply: true,
    delayAfterMs: 800,
  },
  {
    title: 'Void space',
    videoSrc: 'v1787325296/section3_gif2_rcvgmi.webp',
    arrowsUrl: `${CLOUD_BASE}/f_auto,q_auto/v1787333483/section3_arrows3_d2nzks.png`,
    gifPos: { top: 'calc(29% - 20px)', left: 'calc(39% - 67.5px)', width: '73.5%', height: '74.5%' },
    hasAlpha: false,
    arrowEarlyS: 1.5,
    delayAfterMs: 700,
  },
  {
    title: 'Pore',
    videoSrc: 'v1787325296/section3_gif3_rdboz4.gif',
    arrowsUrl: `${CLOUD_BASE}/f_auto,q_auto/v1787333483/section3_arrows2_xiclwo.png`,
    gifPos: { top: 'calc(19% + 10px)', left: 'calc(16% - 6px)', width: '67%', height: '76%' },
    hasAlpha: true,
    gifDurationMs: 4800,
  },
];

const BETWEEN_DELAY_MS = 400; // pause between cards
const ARROW_EARLY_S = 0.5; // show arrows this many seconds before video/gif technically ends

const bounceInStyle = document.createElement('style');
bounceInStyle.textContent = `
@keyframes arrowsBounceIn {
  0%   { opacity: 0; transform: scale(0.85); }
  50%  { opacity: 1; transform: scale(1.06); }
  75%  { transform: scale(0.97); }
  100% { opacity: 1; transform: scale(1); }
}
`;
document.head.appendChild(bounceInStyle);

const TermCard: React.FC<{
  term: TermItem;
  play: boolean;
  visible: boolean;
  onNearEnd: () => void;
}> = ({ term, play, visible, onNearEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showArrows, setShowArrows] = useState(false);
  const timerRef = useRef<number | null>(null);
  const arrowTimerRef = useRef<number | null>(null);
  const onNearEndRef = useRef(onNearEnd);
  onNearEndRef.current = onNearEnd;
  const firedRef = useRef(false);
  const [gifKey, setGifKey] = useState(0);
  const [gifDone, setGifDone] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const clearTimers = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (arrowTimerRef.current) { clearTimeout(arrowTimerRef.current); arrowTimerRef.current = null; }
  };

  useEffect(() => {
    if (play) {
      setShowArrows(false);
      firedRef.current = false;

      if (term.hasAlpha) {
        const dur = term.gifDurationMs ?? 5000;
        const earlyDur = Math.max(0, dur - earlyS * 1000);
        setGifKey(k => k + 1);
        setGifDone(false);
        arrowTimerRef.current = window.setTimeout(() => {
          setGifDone(true);
          setShowArrows(true);
          onNearEndRef.current();
        }, earlyDur);
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
        setVideoPlaying(false);
      }
      setShowArrows(false);
      clearTimers();
    }

    return () => clearTimers();
  }, [play]);

  // Preload GIF and its last frame so there's no delay/flash
  useEffect(() => {
    if (term.hasAlpha) {
      const gif = new Image();
      gif.src = `${CLOUD_BASE}/${term.videoSrc}`;
      const lastFrame = new Image();
      lastFrame.src = `${CLOUD_BASE}/pg_-1,f_auto,q_auto/${term.videoSrc}`;
    }
  }, []);

  const earlyS = term.arrowEarlyS ?? ARROW_EARLY_S;

  const onTimeUpdate = () => {
    if (firedRef.current) return;
    const v = videoRef.current;
    if (!v || !v.duration) return;
    if (v.currentTime >= v.duration - earlyS) {
      firedRef.current = true;
      setShowArrows(true);
      onNearEndRef.current();
    }
  };

  return (
    <div
      className="flex flex-col items-center text-center flex-shrink-0"
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    >
      <div className="relative">
        {/* Arrows overlay (transparent PNG) - fades in/out */}
        <img
          src={term.arrowsUrl}
          alt={`${term.title} labels`}
          className="h-80 w-auto relative z-10 pointer-events-none"
          style={{
            opacity: showArrows ? 1 : 0,
            animation: showArrows ? 'arrowsBounceIn 350ms ease-out forwards' : 'none',
          }}
        />

        {term.hasAlpha ? (
          <>
            {/* Animated GIF while playing, static last frame once done */}
            {play && !gifDone && (
              <img
                key={gifKey}
                src={`${CLOUD_BASE}/${term.videoSrc}?_=${gifKey}`}
                alt=""
                className="absolute"
                style={{
                  top: term.gifPos.top,
                  left: term.gifPos.left,
                  width: term.gifPos.width,
                  height: term.gifPos.height,
                  objectFit: 'contain',
                  ...(term.multiply && { mixBlendMode: 'multiply' as const }),
                }}
              />
            )}
            {gifDone && (
              <img
                src={`${CLOUD_BASE}/pg_-1,f_auto,q_auto/${term.videoSrc}`}
                alt=""
                className="absolute"
                style={{
                  top: term.gifPos.top,
                  left: term.gifPos.left,
                  width: term.gifPos.width,
                  height: term.gifPos.height,
                  objectFit: 'contain',
                  ...(term.multiply && { mixBlendMode: 'multiply' as const }),
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
            onPlaying={() => setVideoPlaying(true)}
            onTimeUpdate={onTimeUpdate}
            className="absolute"
            style={{
              top: term.gifPos.top,
              left: term.gifPos.left,
              width: term.gifPos.width,
              height: term.gifPos.height,
              objectFit: 'contain',
              mixBlendMode: 'multiply' as const,
              opacity: videoPlaying ? 1 : 0,
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
  const delayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, []);

  const advanceTo = (index: number, delayMs?: number) => {
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    delayTimerRef.current = window.setTimeout(() => {
      setActiveIndex(prev => Math.max(prev, index));
    }, delayMs ?? BETWEEN_DELAY_MS);
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveIndex(0);
        } else {
          if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
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
      className="pt-14 pb-20 px-4"
      style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8F5F4 100%)' }}
    >
      <div className="max-w-7xl mx-auto">
        <h2 id="terminology-heading" className="section-heading flex flex-col items-center">
          <span className="heading-gradient pb-2">A brief background</span>
          <span className="heading-gradient">for context</span>
        </h2>
        <p className="section-subheading flex flex-col items-center">
          <span>Different terminology gets tossed around.</span>
          <span>Below are some common synonyms</span>
        </p>

        <div className="flex flex-col xl:flex-row items-center justify-center gap-8">
          {TERMS.map((term, i) => (
            <TermCard
              key={term.title}
              term={term}
              visible={activeIndex >= i}
              play={activeIndex >= i}
              onNearEnd={() => advanceTo(i + 1, term.delayAfterMs)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TerminologySection;
