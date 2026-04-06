import { RiResetLeftFill } from "react-icons/ri";
import Slider from "../../app/common/slider/slider";
import { Domain } from "../../app/models/domain";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import * as THREE from 'three';

interface DomainPanelProps {
	isOpen: boolean;
	togglePanelOpen: () => void;
	domain: Domain | null;
	visible: boolean;
	opacity: number;
	// dimmed: boolean;
	colorful: boolean;
	canEdit: boolean;
	slicingActive: boolean, 
	sliceXThreshold: number | null, 
	sliceDomainBounds: {
		min: THREE.Vector3;
		max: THREE.Vector3;
	} | null,
	// theme?: 'Default' | 'Metallic',
	setSlicingActive: (value: boolean) => void, 
	setSliceXThreshold: (value: number) => void,
	// setDimmed: (value: boolean) => void;
	setColorful: (value: boolean) => void;
	setOpacity: (value: number) => void;
	onToggleVisibility: () => void;
	onResetOverrides: () => void;
	onEditClick: () => void;
	className?: string;
	// setTheme?: (theme: 'Default' | 'Metallic') => void;
}

const ParticlesPanel: React.FC<DomainPanelProps> = ({
	isOpen,
	togglePanelOpen,
	domain,
	visible,
	opacity,
	// dimmed,
	colorful,
	canEdit,
	slicingActive,
	sliceXThreshold,
	sliceDomainBounds,
	// theme,
	setSlicingActive,
	setSliceXThreshold,
	// setDimmed,
	setColorful,
	setOpacity,
	onToggleVisibility,
	onResetOverrides,
	onEditClick,
	className,
	// setTheme
}) => {
	return (
		<div className={className ?? "bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 mt-2"}>
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
					<div className="flex justify-start">
						<button
							className="button-tag flex items-center gap-2 mt-2 mb-0"
							onClick={() => {onResetOverrides()}}
						>
							<RiResetLeftFill /> Reset
						</button>
					</div>
		
					<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
						<span>Show particles</span>
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

					<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
						<span className="mr-2">Colorful particles</span>
						<label className="inline-flex items-center cursor-pointer relative w-11 h-6">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={colorful}
								onChange={(e) => {
									const nextColorful = e.target.checked;
									setColorful(nextColorful);
								}}
							/>
							<div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-link-100 transition-colors" />
  							<div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
						</label>
					</div>

					<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
						<span>Slice Particles</span>
						<label className="inline-flex items-center cursor-pointer relative w-11 h-6">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={slicingActive}
								onChange={(e) => setSlicingActive(e.target.checked)}
							/>
							<div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-link-100 transition-colors" />
  							<div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
						</label>
					</div>

					{ slicingActive && sliceXThreshold != null && (
						<Slider
							label="Slice Distance (µm)"
							value={sliceXThreshold}
							min={sliceDomainBounds?.min.x ?? 0}
							max={sliceDomainBounds?.max.x ?? 600}
							step={1}
							onChange={setSliceXThreshold}
						/>
					)}

					<Slider
						label="Opacity"
						value={opacity}
						min={0}
						max={1}
						step={0.01}
						onChange={(value) => {
							setOpacity(value);
						}}
					/>
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

export default ParticlesPanel;