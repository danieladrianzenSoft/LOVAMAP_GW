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

const AUTO_SCROLL_INTERVAL = 3000;
const AUTO_SCROLL_RESUME_DELAY = 5000;

const DescriptorsSection: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const autoScrollTimer = useRef<number | null>(null);
  const resumeTimer = useRef<number | null>(null);
  const isPaused = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  const autoAdvance = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isPaused.current) return;

    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    if (atEnd) {
      // Loop back to start
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      // Scroll by one card width
      const firstCard = el.querySelector<HTMLElement>(':scope > div');
      const amount = firstCard ? firstCard.offsetWidth + 16 : el.clientWidth * 0.3;
      el.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = window.setInterval(autoAdvance, AUTO_SCROLL_INTERVAL);
  }, [autoAdvance]);

  const pauseAndResume = useCallback(() => {
    // Pause auto-scroll
    isPaused.current = true;
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);

    // Resume after delay
    resumeTimer.current = window.setTimeout(() => {
      isPaused.current = false;
      startAutoScroll();
    }, AUTO_SCROLL_RESUME_DELAY);
  }, [startAutoScroll]);

  useEffect(() => {
    checkScroll();

    const el = scrollRef.current;
    if (!el) return;
    const imgs = el.querySelectorAll('img');
    imgs.forEach((img) => img.addEventListener('load', checkScroll));

    startAutoScroll();

    return () => {
      imgs.forEach((img) => img.removeEventListener('load', checkScroll));
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [checkScroll, startAutoScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    pauseAndResume();
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

      <div className="flex items-center gap-4 px-4">
          {/* Left caret */}
          <button
            onClick={() => scroll('left')}
            className={`flex-shrink-0 p-1 transition-colors ${
              canScrollLeft ? 'text-gray-500 hover:text-gray-800' : 'text-gray-200 cursor-default'
            }`}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <FiChevronLeft className="w-8 h-8" />
          </button>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex-1 min-w-0 flex items-center gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {DESCRIPTORS.map((d) => (
            <div
              key={d.id}
              className="flex-none snap-start rounded-lg overflow-hidden px-2"
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

        {/* Right caret */}
        <button
          onClick={() => scroll('right')}
          className={`flex-shrink-0 p-1 transition-colors ${
            canScrollRight ? 'text-gray-500 hover:text-gray-800' : 'text-gray-200 cursor-default'
          }`}
          disabled={!canScrollRight}
          aria-label="Scroll right"
        >
          <FiChevronRight className="w-8 h-8" />
        </button>
      </div>
    </section>
  );
};

export default DescriptorsSection;
