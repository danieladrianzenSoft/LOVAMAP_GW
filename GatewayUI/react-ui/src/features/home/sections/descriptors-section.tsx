import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const CLOUD_BASE = 'https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto';

const DESCRIPTORS = [
  { id: 1, url: `${CLOUD_BASE}/v1787325293/section2_descriptor1_umpk8z.png` },
  { id: 2, url: `${CLOUD_BASE}/v1787325293/section2_descriptor2_e3nvgn.png` },
  { id: 3, url: `${CLOUD_BASE}/v1787325293/section2_descriptor3_t4zsud.png` },
  { id: 4, url: `${CLOUD_BASE}/v1787325293/section2_descriptor4_abpodj.png` },
  { id: 5, url: `${CLOUD_BASE}/v1787325293/section2_descriptor5_tz2naj.png` },
  { id: 6, url: `${CLOUD_BASE}/v1787325295/section2_descriptor6_br32dg.png` },
  { id: 7, url: `${CLOUD_BASE}/v1787325295/section2_descriptor7_pjlf0y.png` },
  { id: 8, url: `${CLOUD_BASE}/v1787325295/section2_descriptor8_xktcxz.png` },
  { id: 9, url: `${CLOUD_BASE}/v1787325295/section2_descriptor9_hhaynq.png` },
];

/** Pixels per second for continuous scroll */
const SCROLL_SPEED = 40;
/** How far (px) the arrow buttons jump */
const ARROW_SCROLL = 400;
/** Duration (ms) for arrow smooth scroll */
const ARROW_DURATION = 400;

const DescriptorsSection: React.FC = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isPaused = useRef(false);
  const setWidthRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  // Arrow smooth-scroll animation state
  const arrowAnim = useRef<{ start: number; from: number; to: number } | null>(null);

  // Measure the width of one full set of items
  const measureSet = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setWidthRef.current = track.scrollWidth / 2;
  }, []);

  useEffect(() => {
    measureSet();
    window.addEventListener('resize', measureSet);
    return () => window.removeEventListener('resize', measureSet);
  }, [measureSet]);

  // Wait for images to load before measuring
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const imgs = track.querySelectorAll('img');
    const onLoad = () => measureSet();
    imgs.forEach((img) => img.addEventListener('load', onLoad));
    return () => imgs.forEach((img) => img.removeEventListener('load', onLoad));
  }, [measureSet]);

  const tick = useCallback((timestamp: number) => {
    const track = trackRef.current;
    if (!track) { rafRef.current = requestAnimationFrame(tick); return; }

    // Handle arrow animation
    if (arrowAnim.current) {
      const { start, from, to } = arrowAnim.current;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / ARROW_DURATION, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      offsetRef.current = from + (to - from) * eased;
      if (progress >= 1) arrowAnim.current = null;
    } else if (!isPaused.current) {
      const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
      offsetRef.current += SCROLL_SPEED * dt;
    }

    // Seamless wrap
    const sw = setWidthRef.current;
    if (sw > 0) {
      while (offsetRef.current >= sw) offsetRef.current -= sw;
      while (offsetRef.current < 0) offsetRef.current += sw;
    }

    track.style.transform = `translateX(${-offsetRef.current}px)`;
    lastTimeRef.current = timestamp;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  useEffect(() => {
    isPaused.current = hovered;
  }, [hovered]);

  const scroll = (direction: 'left' | 'right') => {
    const delta = direction === 'right' ? ARROW_SCROLL : -ARROW_SCROLL;
    arrowAnim.current = {
      start: performance.now(),
      from: offsetRef.current,
      to: offsetRef.current + delta,
    };
  };

  return (
    <section className="pt-28 pb-0 bg-white">
      <div className="px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center mb-6">
          A quick snapshot of LOVAMAP outputs
        </h2>
        <p className="section-subheading !mb-12">
          Topics include pore size and orientation, paths through the void space,
          and connections between pores
        </p>
      </div>

      <div
        className="flex items-center gap-4 px-4"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Left caret */}
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Scroll left"
        >
          <FiChevronLeft className="w-8 h-8" />
        </button>

        {/* Viewport — clips the track */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Track — translated via transform for cross-browser support */}
          <div
            ref={trackRef}
            className="flex items-center gap-4 will-change-transform"
            style={{ width: 'max-content' }}
          >
            {[...DESCRIPTORS, ...DESCRIPTORS].map((d, i) => (
              <div
                key={`${d.id}-${i}`}
                className="flex-none rounded-lg overflow-hidden px-2"
              >
                <img
                  src={d.url}
                  alt={`Descriptor ${d.id}`}
                  loading="lazy"
                  className="h-72 w-auto"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right caret */}
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Scroll right"
        >
          <FiChevronRight className="w-8 h-8" />
        </button>
      </div>
    </section>
  );
};

export default DescriptorsSection;
