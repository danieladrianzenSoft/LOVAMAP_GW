import { Domain } from "../../app/models/domain";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

interface DomainPanelProps {
	isOpen: boolean;
	togglePanelOpen: () => void;
	domain: Domain | null;
	visible: boolean;
	onToggleVisibility: () => void;
	onToggleHideEdgePores?: (hide: boolean) => void;
	areEdgePoresHidden?: boolean; 
}

const PoresPanel: React.FC<DomainPanelProps> = ({
  isOpen,
  togglePanelOpen,
  domain,
  visible,
  onToggleVisibility,
  onToggleHideEdgePores,
  areEdgePoresHidden
}) => {
  return (
    <div className="bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 mt-2">
      <div
        className={`flex justify-between items-center cursor-pointer transition-all duration-300 ${
          isOpen ? "border-b border-gray-300 pb-2" : "pb-0"
        }`}
        onClick={togglePanelOpen}
      >
        <h2 className="text-sm font-semibold text-gray-800">Pores</h2>
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </div>

      <div className={`overflow-hidden ${
          isOpen ? "max-h-102 opacity-100" : "max-h-0 opacity-0"
        }`}>
			{domain ? (
			<div className="mt-3 text-sm text-gray-700">
				<div>
					<button
						className="text-blue-600 hover:text-blue-800 text-xs"
						onClick={(e) => {
							e.stopPropagation();
							onToggleVisibility();
							}}
						>
						{visible ? "Hide pores" : "Show pores"}
					</button>
				</div>
				{visible && 
					<div>
						<button
							className="text-blue-600 hover:text-blue-800 text-xs"
							onClick={() => {
								onToggleHideEdgePores?.(!areEdgePoresHidden);
							}}
						>
							{areEdgePoresHidden ? "Show edge pores" : "Hide edge pores"}
						</button>
					</div>
				}
				{/* <p className="mt-2">
				<span className="font-semibold">Voxel Size:</span> {domain.voxelSize ?? "Unknown"}
				</p> */}
			</div>
			) : (
				<p className="mt-2 text-sm italic text-gray-500">Non-existent domain</p>
			)}
      	</div>
    </div>
  );
};

export default PoresPanel;