import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';

const BANNER_URL =
  'https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/v1787325326/main_banner_hfgjod.png';

const HERO_FONT: React.CSSProperties = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const FAQ_LINKS = [
  { keyword: 'packed particle scaffold', keywordColor: 'text-link-100' },
  { keyword: '3D pore', keywordColor: 'text-orange-500' },
];

const HeroSection: React.FC = () => {
  const scrollToTerminology = () => {
    const el = document.getElementById('terminology');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="w-full bg-white pt-20">
      {/* Desktop: side-by-side | Mobile: banner behind, text overlay */}
      <div className="relative min-h-[80vh]">
        {/* Banner image — full width background */}
        <img
          src={BANNER_URL}
          alt="LOVAMAP banner"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover object-left"
        />

        {/* Text content — floating card over the banner */}
        <div
          className="relative z-10 flex items-center justify-end min-h-[80vh] px-4 md:px-10"
        >
          <div
            className="w-full md:w-[45%] flex flex-col justify-center px-8 md:px-12 lg:px-16 py-16 bg-white/75 backdrop-blur-sm rounded-2xl"
            style={HERO_FONT}
          >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-black mb-6">
            LOVAMAP is a software that analyzes packed particle porosity
          </h1>
          <p className="text-base md:text-lg text-black mb-8 leading-relaxed">
            It starts by breaking up the void space between particles into
            natural open pockets of space called &lsquo;3D pores&rsquo;
          </p>

          <div className="mb-10">
            <Link
              to="/run"
              className="button-secondary px-8 py-3 text-lg"
            >
              Run LOVAMAP
            </Link>
          </div>

          {/* Links that scroll to terminology section */}
          <div className="space-y-3 max-w-md">
            {FAQ_LINKS.map((item, idx) => (
              <button
                key={idx}
                onClick={scrollToTerminology}
                className="flex items-start gap-2 text-base text-gray-500 hover:text-gray-700 transition-colors text-left"
              >
                <FiChevronRight className="w-4 h-4 flex-shrink-0 mt-1" />
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
