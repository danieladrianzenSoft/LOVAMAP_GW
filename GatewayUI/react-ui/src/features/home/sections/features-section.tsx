import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

interface FeatureCard {
  title: string;
  description: string;
  videoUrl: string;
  link: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: 'Analyze your scaffold',
    description:
      'Upload custom microscope images or simulated particle data and run LOVAMAP to compute pore descriptors and visualizations.',
    videoUrl:
      'https://res.cloudinary.com/danmkw7ni/video/upload/c_crop,w_820,h_520,g_center/c_pad,w_960,h_540,b_white/v1787325324/section1_analyze_mlnhr5.mp4',
    link: '/visualize',
  },
  {
    title: 'Explore our database',
    description:
      'Browse our published database of 200+ simulated scaffolds with pre-computed descriptors and interactive 3D visualizations.',
    videoUrl:
      'https://res.cloudinary.com/danmkw7ni/video/upload/v1787325324/section1_explore_dyht61.mp4',
    link: '/explore',
  },
  {
    title: 'Quick calculations',
    description:
      'Use our published equations to quickly approximate descriptors without running a full analysis.',
    videoUrl:
      'https://res.cloudinary.com/danmkw7ni/video/upload/v1787325314/section1_quick_orqxin.mp4',
    link: '/descriptor-calculator',
  },
  {
    title: 'Learn about LOVAMAP',
    description:
      'Learn about the functionality and descriptors we offer, including detailed explanations and examples.',
    videoUrl:
      'https://res.cloudinary.com/danmkw7ni/video/upload/v1787325327/section1_learn_g3opn1.mov',
    link: '/learn',
  },
];

const FeatureCardItem: React.FC<{ feature: FeatureCard }> = ({ feature }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    videoRef.current?.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Build poster URL: append poster transforms after any existing transforms
  const posterUrl = feature.videoUrl.replace(/\/v(\d+)\//, '/so_0,f_jpg,w_600/v$1/');

  return (
    <Link
      to={feature.link}
      className="group flex flex-col bg-white rounded-xl hover:shadow-xl transition-shadow overflow-hidden h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="overflow-hidden bg-white aspect-video pt-5 px-4">
        <video
          ref={videoRef}
          src={feature.videoUrl}
          poster={posterUrl}
          muted
          loop
          playsInline
          preload="none"
          className="w-full h-full object-contain"
        />
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-2xl font-semibold text-gray-800 group-hover:text-link-200 transition-colors mb-2">
          {feature.title}
        </h3>
        <p className="text-base text-gray-600 leading-relaxed">{feature.description}</p>
      </div>
    </Link>
  );
};

const FeaturesSection: React.FC = () => {
  return (
    <section
      className="pt-20 pb-28 px-4"
      style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #F5F5F8 41%)' }}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="section-heading flex flex-col items-center">
          <span className="heading-gradient pb-2">High resolution data</span>
          <span className="heading-gradient">Dynamic visualizations</span>
        </h2>
        <p className="section-subheading">
          An online platform for packed particle analysis
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURES.map((feature) => (
            <FeatureCardItem key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
