import React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import Tag from "../../app/common/tag/tag";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import { Domain } from  "../../app/models/domain";

interface Props {
  isOpen: boolean;
  toggleOpen: () => void;
  scaffoldGroup: ScaffoldGroup | null;
  selectedScaffoldId: number | null;
  onScaffoldChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedCategories: number[];
  onCategoryChange: (values: number[]) => void;
  domain: Domain | null;
  // canEdit: boolean;
  // onEditClick: () => void;
  isLoading: boolean;
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
  domain,
  // canEdit,
  // onEditClick,
  isLoading,
}) => {

  return (
    <div className="bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64">
      <div
        className={`flex justify-between items-center cursor-pointer transition-all duration-300 ${
          isOpen ? "border-b border-gray-300 pb-2" : "pb-0"
        }`}
        onClick={toggleOpen}
      >
        <h2 className="text-sm font-semibold text-gray-800">Scaffold Info</h2>
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
                <span className="font-semibold">ID:</span> {scaffoldGroup.id ?? "Unknown"}
              </p>

              <p className="mt-2">
                <span className="font-semibold">Simulated:</span> {scaffoldGroup.isSimulated ? "Yes" : "No"}
              </p>

              <p className="mt-2">
                <span className="font-semibold">Packing:</span> {scaffoldGroup.inputs?.packingConfiguration ?? "Unknown"}
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

              {/* <div className="mt-2">
                <CategorySelector
                  name="Domain Category: "
                  categories={domainCategories}
                  selected={selectedCategories}
                  onChange={onCategoryChange}
                  multiSelect={false}
                />
              </div> */}

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