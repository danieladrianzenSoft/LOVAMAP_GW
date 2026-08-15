import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import { FaCamera } from "react-icons/fa";

interface Props {
  isOpen: boolean;
  toggleOpen: () => void;
  scaffoldGroup: ScaffoldGroup | null;
  isLoading: boolean;
  selectedScaffoldId?: number | null;
  onScreenshot?: () => void;
  className?: string;
}

const InfoPanel: React.FC<Props> = ({
  isOpen,
  toggleOpen,
  scaffoldGroup,
  onScreenshot,
  isLoading,
  selectedScaffoldId,
  className,
}) => {

  const [showMore, setShowMore] = useState(false);
  const particles = scaffoldGroup?.inputs?.particles ?? [];
  const firstParticle = particles[0];

  return (
    <div className={className ?? "bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64"}>
      <div
        className={`flex justify-between items-center transition-all duration-300 cursor-pointer ${
          isOpen ? "border-b border-gray-300 pb-2" : "pb-0"
        }`}
        onClick={toggleOpen}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Scaffold Info</h2>
          {onScreenshot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onScreenshot();
              }}
              title="Take Screenshot"
              className="text-gray-400 hover:text-blue-500 transition"
            >
              <FaCamera className="text-base" />
            </button>
          )}
        </div>
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </div>

      <div
        className={`overflow-hidden ${
          isOpen ? "max-h-102 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {scaffoldGroup && !isLoading ?
          (
            <div className="mt-3 text-sm text-gray-700 space-y-1.5">
              <p>
                <span className="font-semibold">Source:</span> {scaffoldGroup.isSimulated ? "Simulated" : "Experimental"}
              </p>
              {particles.length === 1 && firstParticle && (
                <>
                  <p>
                    <span className="font-semibold">Shape:</span> {firstParticle.shape}
                  </p>
                  <p>
                    <span className="font-semibold">Size:</span> {firstParticle.meanSize?.toPrecision(3)}&#956;m
                  </p>
                  <p>
                    <span className="font-semibold">Composition:</span> {firstParticle.dispersity?.toLowerCase()}
                  </p>
                </>
              )}
              {particles.length > 1 && (
                <div>
                  <span className="font-semibold">Particles:</span>
                  <ul className="ml-3 mt-0.5 space-y-0.5 text-gray-600">
                    {particles.map((p, i) => (
                      <li key={i}>
                        {(p.proportion * 100).toPrecision(3)}% &middot; {p.meanSize?.toPrecision(3)}&#956;m {p.shape}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p>
                <span className="font-semibold">Packing:</span> {scaffoldGroup.inputs?.packingConfiguration ?? "Unknown"}
              </p>
              {scaffoldGroup.inputs?.containerShape && (
                <p>
                  <span className="font-semibold">Container:</span> {scaffoldGroup.inputs.containerShape}
                </p>
              )}

              <div className="flex justify-start items-start pt-2">
                <button
                  className="button-link"
                  onClick={() => setShowMore(!showMore)}
                >
                  {`${showMore ? 'Hide' : 'Show more'}`}
                </button>
              </div>

              {showMore && (
                <div className="text-sm text-gray-700 space-y-1">
                  {firstParticle && (
                    <>
                      {firstParticle.friction && (
                        <p>
                          <span className="font-semibold">Friction:</span> {firstParticle.friction}
                        </p>
                      )}
                      {firstParticle.material && (
                        <p>
                          <span className="font-semibold">Material:</span> {firstParticle.material}
                        </p>
                      )}
                    </>
                  )}
                  <p className="pt-2">
                    <span className="font-semibold">Scaffold Group ID:</span> {scaffoldGroup.id ?? "Unknown"}
                  </p>
                  {selectedScaffoldId && (
                    <p>
                      <span className="font-semibold">Scaffold ID:</span> {selectedScaffoldId}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : isLoading ? (
            <p className="text-sm text-gray-600 italic mt-3">Loading...</p>
          ) : (
            <p className="text-sm text-gray-600 italic mt-3">Scaffold Group data unavailable</p>
          )
        }
      </div>
    </div>
  );
};

export default InfoPanel;