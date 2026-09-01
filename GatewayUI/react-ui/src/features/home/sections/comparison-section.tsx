import React from 'react';
import { Link } from 'react-router-dom';

const CLOUD_BASE = 'https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto';

const IMAGE_2D = `${CLOUD_BASE}/v1787325296/section4_image1_ryyj4q.png`;
const PLOT_2D = `${CLOUD_BASE}/v1787325296/section4_plot1_d1z0vk.png`;
const IMAGE_3D = `${CLOUD_BASE}/v1787325297/section4_image2_nky2nl.png`;
const PLOT_3D = `${CLOUD_BASE}/v1787325296/section4_plot2_wszijv.png`;

const ComparisonSection: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Text */}
          <div className="lg:w-2/5 flex flex-col">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              Analyzing void space in 2D is easier, but does it produce comparable results to 3D?
            </h2>
            <p className="text-lg md:text-xl text-black mb-8 leading-relaxed" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 300 }}>
              We&rsquo;ve compared packed particle descriptors computed over 2D-slice
              data versus complete 3D data, and results suggest there&rsquo;s a difference.
            </p>
            <div>
              <Link
                to="/learn#compare-2d-3d"
                className="button-secondary px-12 py-4 text-lg md:text-xl"
              >
                Compare 2D vs. 3D
              </Link>
            </div>
          </div>

          {/* Right: Images and plots */}
          <div className="w-full lg:w-3/5 flex justify-center">
            <div className="flex flex-col gap-4 max-w-2xl w-full">
              {/* Images row — flex widths proportional to aspect ratio so heights match */}
              <div className="flex gap-4">
                <div className="rounded-lg overflow-hidden" style={{ flex: '1698 1 0%' }}>
                  <img src={IMAGE_2D} alt="2D analysis" loading="lazy" className="w-full h-auto" />
                </div>
                <div className="rounded-lg overflow-hidden" style={{ flex: '1539 1 0%' }}>
                  <img src={IMAGE_3D} alt="3D analysis" loading="lazy" className="w-full h-auto" />
                </div>
              </div>
              {/* Plots row — aligned under respective images */}
              <div className="flex gap-4">
                <div style={{ flex: '1698 1 0%' }}>
                  <div className="rounded-lg overflow-hidden w-5/6">
                    <img src={PLOT_2D} alt="2D plot" loading="lazy" className="w-full h-auto" />
                  </div>
                </div>
                <div style={{ flex: '1539 1 0%' }}>
                  <div className="rounded-lg overflow-hidden w-11/12">
                    <img src={PLOT_3D} alt="3D plot" loading="lazy" className="w-full h-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
