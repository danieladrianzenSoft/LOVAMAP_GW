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
