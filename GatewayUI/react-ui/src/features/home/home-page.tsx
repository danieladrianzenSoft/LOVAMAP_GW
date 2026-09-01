import React, { useEffect, useRef, useState } from 'react';
import HomeNav from './home-nav';
import HomeFooter from './home-footer';
import HeroSection from './sections/hero-section';
import FeaturesSection from './sections/features-section';
import TerminologySection from './sections/terminology-section';

// Lazy-loaded below-the-fold sections
const DescriptorsSection = React.lazy(() => import('./sections/descriptors-section'));
const ComparisonSection = React.lazy(() => import('./sections/comparison-section'));
const TutorialsSection = React.lazy(() => import('./sections/tutorials-section'));

/** Renders children only after the sentinel element enters the viewport. */
const LazySection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        <React.Suspense fallback={<div className="py-20" />}>{children}</React.Suspense>
      ) : (
        <div className="py-20" />
      )}
    </div>
  );
};

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Institutional logos banner */}
      <div className="w-full bg-[#061957]">
        <div className="flex items-center justify-between px-8 py-2.5">
          <img
            src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/Duke_Pratt_School_of_Engineering_logo_WHITE_fnt3om"
            alt="Duke Pratt School of Engineering"
            className="h-5 md:h-7 w-auto"
          />
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/MIMC_logo_WHITE_o7gbjl"
              alt="Materials in Medicine Center"
              className="h-8 md:h-11 w-auto"
            />
            <div className="text-white" style={{ fontFamily: "'Barlow', sans-serif", lineHeight: '1.1' }}>
              <div className="text-[13px] md:text-[15px] font-medium tracking-wide uppercase">Materials in</div>
              <div className="text-[13px] md:text-[15px] font-medium tracking-wide uppercase">Medicine Center</div>
            </div>
          </div>
        </div>
      </div>

      <HomeNav />

      <HeroSection />
      <FeaturesSection />

      <LazySection>
        <DescriptorsSection />
      </LazySection>

      <TerminologySection />

      <LazySection>
        <ComparisonSection />
      </LazySection>

      <LazySection>
        <TutorialsSection />
      </LazySection>

      <HomeFooter />
    </div>
  );
};

export default HomePage;
