import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';

const BANNER_URL =
  'https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/v1787325326/main_banner_full_mj06em.png';

const HERO_FONT: React.CSSProperties = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const FAQ_LINKS = [
  { keyword: 'packed particle scaffold', keywordColor: 'text-link-100' },
  { keyword: '3D pore', keywordColor: 'text-link-100' },
];

const HeroSection: React.FC = () => {
  const scrollToTerminology = () => {
    const heading = document.getElementById('terminology-heading');
    if (!heading) return;

    const start = window.scrollY;
    const offset = 120;
    const duration = 1200;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      // Recalculate target each frame so layout shifts from loading images
      // don't cause the scroll to land short
      const end = heading.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo(0, start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  return (
    <section className="w-full bg-white pb-20">
      {/* Desktop: side-by-side | Mobile: banner behind, text overlay */}
      <div className="relative min-h-[95vh]">
        {/* Banner image — full width background */}
        <img
          src={BANNER_URL}
          alt="LOVAMAP banner"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover object-left"
        />

        {/* Text content — floating card over the banner */}
        <div
          className="relative z-10 flex items-center justify-end min-h-[95vh] px-4 md:px-10"
        >
          <div
            className="w-full md:w-[45%] flex flex-col justify-center px-8 md:px-12 lg:px-16 py-16 bg-white/75 backdrop-blur-sm rounded-2xl"
            style={HERO_FONT}
          >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-black mb-8">
            LOVAMAP is a software that analyzes packed particle porosity
          </h1>
          <p className="text-xl md:text-2xl lg:text-[1.7rem] text-black mb-10 leading-relaxed" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 300 }}>
            It starts by breaking up the void space between particles into
            natural open pockets of space called &lsquo;3D pores&rsquo;
          </p>

          <div className="mb-10">
            <Link
              to="/run"
              className="button-secondary px-12 py-4 text-lg md:text-xl"
            >
              Run LOVAMAP
            </Link>
          </div>

          {/* FAQ links that scroll to terminology section */}
          <div className="space-y-1.5 max-w-md">
            <p className="text-lg md:text-xl text-gray-500">FAQ:</p>
            {FAQ_LINKS.map((item, idx) => (
              <button
                key={idx}
                onClick={scrollToTerminology}
                className="flex items-center gap-2 text-lg md:text-xl text-gray-500 hover:text-gray-700 transition-colors text-left"
              >
                <FiChevronRight className="w-5 h-5 flex-shrink-0" />
                <span>
                  What&rsquo;s a{' '}
                  <span className={`font-semibold ${item.keywordColor}`}>
                    {item.keyword}
                  </span>
                  ?
                </span>
              </button>
            ))}
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Offered by the Materials in Medicine Center at Duke University
          </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
