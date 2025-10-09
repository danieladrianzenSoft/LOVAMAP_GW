import React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

interface Props {
  isOpen: boolean;
  toggleOpen: () => void;
  category: number;
  hiddenIds: Set<string>;
  onShowAll: () => void;
  onToggleVisibility: (particleId: string) => void;
}

const HiddenPanel: React.FC<Props> = ({
  isOpen,
  toggleOpen,
  category,
  hiddenIds,
  onShowAll,
  onToggleVisibility,
}) => {
  if (hiddenIds.size === 0) return null;

  return (
    <div className="mt-2 bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64">
      <div
        className={`flex justify-between items-center transition-all duration-300 ${
          isOpen ? "border-b border-gray-300 pb-2" : "pb-0"
        }`}
        onClick={toggleOpen}
      >
        <h2 className="text-sm font-semibold text-gray-800">{`Hidden ${category === 0 ? "Particles" : "Pores"}`}</h2>
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </div>
      
      {/* <div className="flex justify-between items-center cursor-pointer border-b border-gray-300 pb-2">
        
      </div> */}

      <div
        className={`overflow-hidden ${
          isOpen ? "max-h-102 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-2 text-sm text-gray-700 max-h-40 overflow-y-auto">
          <div className="flex justify-end items-end pb-2">
            <button
              className="text-blue-600 hover:text-blue-800 text-xs"
              onClick={onShowAll}
            >
              Show all
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {Array.from(hiddenIds).map((entityId) => (
              <li key={entityId} className="flex justify-between items-center">
                <span>{`${category === 0 ? "particle " : "pore "}`}{entityId.split('-')[0]}</span>
                <button
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  onClick={() => onToggleVisibility(entityId)}
                >
                  Show
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
    </div>
  );
};

export default HiddenPanel;