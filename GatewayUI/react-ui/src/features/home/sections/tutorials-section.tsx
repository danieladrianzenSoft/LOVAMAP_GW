import React from 'react';

const TutorialsSection: React.FC = () => {
  return (
    <section className="py-20 px-6 bg-secondary-50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="section-heading flex flex-col items-center">
          <span className="heading-gradient">Tutorials and workshops</span>
        </h2>
        <p className="section-subheading">
          Curated to help users understand how to use LOVAMAP
        </p>
        <div className="inline-block bg-white rounded-xl px-10 py-8">
          <p className="text-lg text-gray-400 font-medium">Coming soon</p>
        </div>
      </div>
    </section>
  );
};

export default TutorialsSection;
