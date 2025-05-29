import React from "react";

interface Props {
  category: number;
  hiddenIds: Set<string>;
  onShowAll: () => void;
  onToggleVisibility: (particleId: string) => void;
}

const HiddenPanel: React.FC<Props> = ({
  category,
  hiddenIds,
  onShowAll,
  onToggleVisibility,
}) => {
  if (hiddenIds.size === 0) return null;

  return (
    <div className="mt-2 bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 transition-all duration-300">
      <div className="flex justify-between items-center cursor-pointer border-b border-gray-300 pb-2">
        <h2 className="text-sm font-semibold text-gray-800">{`Hidden ${category === 0 ? "Particles" : "Pores"}`}</h2>
        <button
          className="text-blue-600 hover:text-blue-800 text-xs"
          onClick={onShowAll}
        >
          Show all
        </button>
      </div>

      <div className="mt-2 text-sm text-gray-700 max-h-40 overflow-y-auto">
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
  );
};

export default HiddenPanel;