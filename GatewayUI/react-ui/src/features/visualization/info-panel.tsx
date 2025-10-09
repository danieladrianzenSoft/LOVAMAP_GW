import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import Tag from "../../app/common/tag/tag";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import { Domain } from  "../../app/models/domain";
import { FaCamera } from "react-icons/fa";

interface Props {
  isOpen: boolean;
  toggleOpen: () => void;
  scaffoldGroup: ScaffoldGroup | null;
  selectedScaffoldId: number | null;
  onScaffoldChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedCategories: number[];
  onCategoryChange: (values: number[]) => void;
  domain: Domain | null;
  isLoading: boolean;
  theme?: 'Metallic' | 'Sunset',
  setTheme?: (theme: 'Metallic' | 'Sunset') => void;
  onScreenshot?: () => void;
}

// const domainCategories = [
//   { value: 0, label: "Particles" },
//   { value: 1, label: "Pores" },
//   { value: 2, label: "Other" },
// ];

const InfoPanel: React.FC<Props> = ({
  isOpen,
  toggleOpen,
  scaffoldGroup,
  selectedScaffoldId,
  onScaffoldChange,
  selectedCategories,
  onCategoryChange,
  onScreenshot,
  domain,
  // canEdit,
  // onEditClick,
  theme,
  setTheme,
  isLoading,
}) => {

  const [showMore, setShowMore] = useState(false);

  return (
    <div className="bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64">
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
            <div className="mt-3 text-sm text-gray-700">
              <div className="flex flex-wrap gap-y-1 mb-2">
                {scaffoldGroup.tags.map((tag, index) => (
                  <Tag key={index} text={tag} />
                ))}
              </div>

              <p className="mt-2">
                <span className="font-semibold">Name:</span> {scaffoldGroup.name ?? "Unknown"}
              </p>

              <p className="mt-2">
                <span className="font-semibold">Simulated:</span> {scaffoldGroup.isSimulated ? "Yes" : "No"}
              </p>

              <p className="mt-2">
                <span className="font-semibold">Packing:</span> {scaffoldGroup.inputs?.packingConfiguration ?? "Unknown"}
              </p>

              <div className="flex justify-between items-center mt-3 text-sm text-gray-700">
                <label htmlFor="themeSelect" className="mr-2 font-semibold">Theme</label>
                <select
                  id="themeSelect"
                  value={theme}
                  onChange={(e) => setTheme?.(e.target.value as 'Metallic' | 'Sunset')}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="Metallic">Metallic</option>
                  <option value="Sunset">Sunset</option>
                </select>
              </div>

              <div className="flex justify-start items-start mt-4">
                <button
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  onClick={() => setShowMore(!showMore)}
                >
                  {`${showMore ? 'Hide' : 'Show more'}`}
                </button>
              </div>

              {showMore && (
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="mt-4">
                    <span className="font-semibold">ID:</span> {scaffoldGroup.id ?? "Unknown"}
                  </p>
                  <div className="mt-2">
                    <label className="block text-sm font-semibold text-gray-800">Replicate ID:</label>
                    <select
                      className="mt-1 block w-full border bg-opacity-80 border-gray-300 rounded-md p-1 text-gray-700 focus:ring focus:ring-blue-300"
                      value={selectedScaffoldId ?? ""}
                      onChange={onScaffoldChange}
                    >
                      {scaffoldGroup.scaffoldIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {selectedCategories[0] === 1 && domain != null &&(
                <div className="flex flex-end -mt-3 justify-end">
                  {/* <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="form-checkbox text-blue-600"
                      onChange={(e) => {
                        if (onToggleHideEdgePores) {
                          onToggleHideEdgePores(e.target.checked);
                        }
                      }}
                    />
                    <span className="text-sm text-gray-800">Hide Edge Pores</span>
                  </label> */}
                </div>
              )}

              {/* <p className="mt-2">
                <span className="font-semibold">Voxel Size:</span> {domain?.voxelSize ?? "Unknown"}
              </p> */}

              {/* {canEdit && (
                <div className="mt-4">
                  <button
                    className="button-outline self-start flex items-center gap-2"
                    onClick={onEditClick}
                  >
                    Update
                  </button>
                </div>
              )} */}
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