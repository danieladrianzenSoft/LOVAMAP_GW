import { Domain } from "../../app/models/domain";
import { FiChevronDown, FiChevronUp, FiShuffle } from "react-icons/fi";

interface DomainPanelProps {
	isOpen: boolean;
	togglePanelOpen: () => void;
	domain: Domain | null;
	visible: boolean;
	canEdit: boolean;
	onToggleVisibility: () => void;
	onToggleHideEdgePores?: (hide: boolean) => void;
	areEdgePoresHidden?: boolean;
	onEditClick: () => void;
	className?: string;
	onRefreshColors?: () => void;
}

const PoresPanel: React.FC<DomainPanelProps> = ({
  isOpen,
  togglePanelOpen,
  domain,
  visible,
  canEdit,
  onToggleVisibility,
  onToggleHideEdgePores,
  areEdgePoresHidden,
  onEditClick,
  className,
  onRefreshColors,
}) => {
  return (
    <div className={className ?? "bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 mt-2"}>
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
			<>
				<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
					<span>Show pores</span>
					<label className="inline-flex items-center cursor-pointer relative w-11 h-6">
						<input
							type="checkbox"
							className="sr-only peer"
							checked={visible}
							onChange={() => onToggleVisibility()}
						/>
						<div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-link-100 transition-colors" />
						<div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
					</label>
				</div>

				{onToggleHideEdgePores && (
					<div className={`flex justify-between items-center mt-3 text-sm ${visible ? 'text-gray-700' : 'text-gray-400'}`}>
						<span>Show edge pores</span>
						<label className={`inline-flex items-center relative w-11 h-6 ${visible ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
							<input
								type="checkbox"
								className="sr-only peer"
								checked={!areEdgePoresHidden}
								disabled={!visible}
								onChange={(e) => onToggleHideEdgePores(!e.target.checked)}
							/>
							<div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-link-100 peer-disabled:opacity-50 transition-colors" />
							<div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
						</label>
					</div>
				)}

				{onRefreshColors && (
					<div className="flex justify-start">
						<button
							className="button-tag flex items-center gap-2 mt-3 mb-0 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={onRefreshColors}
							disabled={!visible}
							title={visible ? "Randomize colors" : "Show pores to randomize colors"}
						>
							<FiShuffle /> Randomize colors
						</button>
					</div>
				)}
			</>
			) : (
				<p className="mt-2 text-sm italic text-gray-500">Non-existent domain</p>
			)}
			{canEdit && (
				<div className="mt-4">
					<button
					className="button-outline self-start flex items-center gap-2"
					onClick={onEditClick}
					>
					Update
					</button>
				</div>
			)}
      	</div>
    </div>
  );
};

export default PoresPanel;
