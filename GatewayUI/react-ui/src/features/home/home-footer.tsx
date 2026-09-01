import React from 'react';
import { Link } from 'react-router-dom';

const footerLinks = [
  {
    heading: 'Tools',
    links: [
      { label: 'Run LOVAMAP', to: '/run' },
      { label: 'Visualize', to: '/visualize' },
      { label: 'Descriptor Calculator', to: '/descriptor-calculator' },
    ],
  },
  {
    heading: 'Data',
    links: [
      { label: 'Explore Scaffolds', to: '/explore' },
      { label: 'Explore Data', to: '/data' },
      { label: 'Download Data', to: '/experiments' },
    ],
  },
  {
    heading: 'Education',
    links: [
      { label: 'Learn', to: '/learn' },
      { label: 'Publications', to: '/publications' },
    ],
  },
];

const HomeFooter: React.FC = () => {
  return (
    <footer className="bg-primary-900 text-white py-10 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Main content row */}
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-0">
          {/* Duke logo — left */}
          <div className="flex items-center flex-shrink-0 md:w-1/5">
            <img
              src="/Duke-Pratt-Logo.png"
              alt="Duke Pratt"
              className="h-20 w-auto"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>

          {/* Link columns — center */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 md:justify-items-center">
            {footerLinks.map((col) => (
              <div key={col.heading}>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-3">
                  {col.heading}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* MIMC logo — right */}
          <div className="flex items-center justify-end flex-shrink-0 md:w-1/5">
            <img
              src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/MIMC_logo_irilsb"
              alt="Materials in Medicine Center"
              className="h-24 w-auto"
            />
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} LOVAMAP. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
