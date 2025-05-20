import { FaSpinner } from "react-icons/fa";
import { ScaffoldGroup } from "../../models/scaffoldGroup";
import Tag from "../tag/tag";

interface SearchResultsDropdownProps {
  results: ScaffoldGroup[];
  isLoading: boolean;
  onSelect: (id: number) => void;
  onAdd?: (group: ScaffoldGroup) => void;
  selectedTagNames?: string[];
  selectedParticleSizeIds?: number[];
  loadingSelection?: number | null;
}

export const SearchResultsDropdown: React.FC<SearchResultsDropdownProps> = ({
  results,
  isLoading,
  onSelect,
  onAdd,
  selectedTagNames,
  selectedParticleSizeIds,
  loadingSelection
}) => {
  if (!results.length && !isLoading) return null;

  return (
    <div className="absolute mt-0 bg-white border border-gray-300 rounded-lg shadow-md max-h-64 overflow-y-auto z-50 w-full">
      {isLoading ? (
        <div className="px-4 py-2 text-gray-500 text-sm">Searching...</div>
      ) : (
        results.map((group) => {
          const particleImage = group.images?.find((img) => img.category.toLocaleLowerCase() === 'particles');
          return (
            <div
              key={group.id}
              onClick={() => {if (loadingSelection === null) onSelect(group.id)}}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
            >
              <div className="flex items-center gap-2">
                {/* Thumbnail image */}
                {particleImage && (
                  <img
                    src={particleImage.url}
                    alt="Particle thumbnail"
                    className="w-8 h-8 object-cover rounded-sm"
                  />
                )}

                {/* Name and tags */}
                <div className="flex flex-wrap gap-x-1 gap-y-1 items-center">
                  <p>{group.name}:</p>
                  {group.tags.map((tag, index) => {
                    const isTagMatch = selectedTagNames?.includes(tag) ?? false;
                    return (
                      <Tag 
                        key={`tag-${index}`} 
                        text={tag} 
                        className={isTagMatch ? "border border-blue-500" : ""} 
                      />
                    )}
                  )}
                  {/* Particle size tags */}
                  {group.inputs?.particles?.map((p, index) => {
                    const displaySize = `${p.meanSize.toPrecision(2)}μm`;
                    const isSizeMatch = selectedParticleSizeIds?.includes(Math.round(p.meanSize)) ?? false;

                    return (
                      <Tag
                        key={`size-${index}`}
                        text={displaySize}
                        className={isSizeMatch ? "border border-blue-500" : ""}
                      />
                    );
                  })}
                </div>
                {/* Optional "Add +" button */}
                {/* Spinner */}
                {loadingSelection === group.id && (
                  <FaSpinner className="animate-spin text-blue-500 ml-2" size={16} />
                )}
                {onAdd && !(loadingSelection === null) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // avoid triggering the row click
                      onAdd(group);
                    }}
                    className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-semibold border border-blue-600 px-2 py-0.5 rounded"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          )})
        )}
    </div>
  );
};