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
	dimmed: boolean;
	canEdit: boolean;
	slicingActive: boolean, 
	sliceXThreshold: number | null, 
	sliceDomainBounds: {
		min: THREE.Vector3;
		max: THREE.Vector3;
	} | null,
	setSlicingActive: (value: boolean) => void, 
	setSliceXThreshold: (value: number) => void,
	setDimmed: (value: boolean) => void;
	setOpacity: (value: number) => void;
	onToggleVisibility: () => void;
	onResetOverrides: () => void;
	onEditClick: () => void;
}

const ParticlesPanel: React.FC<DomainPanelProps> = ({
	isOpen,
	togglePanelOpen,
	domain,
	visible,
	opacity,
	dimmed,
	canEdit,
	slicingActive,
	sliceXThreshold,
	sliceDomainBounds,
	setSlicingActive,
	setSliceXThreshold,
	setDimmed,
	setOpacity,
	onToggleVisibility,
	onResetOverrides,
	onEditClick
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
					<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
						<span className="mr-2">Dim particles</span>
						<label className="inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={dimmed}
								onChange={(e) => {
									const shouldDim = e.target.checked;
									setDimmed(shouldDim);
								}}
							/>
							<div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 relative">
								<div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
							</div>
						</label>
					</div>

					<div className="flex justify-between items-center mt-3 text-sm text-gray-700">
						<span>Slice Particles</span>
						<label className="inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={slicingActive}
								onChange={(e) => setSlicingActive(e.target.checked)}
							/>
							<div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 relative">
								<div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
							</div>
						</label>
					</div>

					{ slicingActive && sliceXThreshold != null && (
						<Slider
							label="Slice Distance (X)"
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