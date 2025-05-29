import { RiResetLeftFill } from "react-icons/ri";
import Slider from "../../app/common/slider/slider";
import { Domain } from "../../app/models/domain";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

interface DomainPanelProps {
	isOpen: boolean;
	togglePanelOpen: () => void;
	domain: Domain | null;
	visible: boolean;
	opacity: number;
	setOpacity: (value: number) => void;
	onToggleVisibility: () => void;
	onResetOverrides: () => void;
}

const ParticlesPanel: React.FC<DomainPanelProps> = ({
	isOpen,
	togglePanelOpen,
	domain,
	visible,
	opacity,
	setOpacity,
	onToggleVisibility,
	onResetOverrides
}) => {
	return (
		<div className="bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 mt-2">
		<div
			className={`flex justify-between items-center cursor-pointer transition-all duration-300 ${
			isOpen ? "border-b border-gray-300 pb-2" : "pb-0"
			}`}
			onClick={togglePanelOpen}
		>
			<h2 className="text-sm font-semibold text-gray-800">Particles</h2>
			{isOpen ? <FiChevronUp /> : <FiChevronDown />}
		</div>

		<div className={`overflow-hidden ${
			isOpen ? "max-h-102 opacity-100" : "max-h-0 opacity-0"
			}`}>
			{domain ? (
				<>
					<div className="mt-3 text-sm text-gray-700">
						<button
							className="text-blue-600 hover:text-blue-800 text-xs"
							onClick={(e) => {
								e.stopPropagation();
								onToggleVisibility();
								}}
							>
							{visible ? "Hide particles" : "Show particles"}
						</button>
					</div>
					<div className="flex justify-end">
						<button
							className="button-tag flex items-center gap-2 mt-1 mb-0"
							onClick={() => {onResetOverrides()}}
						>
							<RiResetLeftFill /> Reset
						</button>
					</div>

					<Slider
						label="Opacity"
						value={opacity}
						min={0}
						max={1}
						step={0.01}
						onChange={setOpacity}
					/>
				</>
			) : (
				<p className="mt-2 text-sm italic text-gray-500">Non-existent domain</p>
			)}
		</div>
		</div>
	);
};

export default ParticlesPanel;