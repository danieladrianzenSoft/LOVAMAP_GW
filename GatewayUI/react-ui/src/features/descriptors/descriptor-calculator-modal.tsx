
import React, { useMemo, useState } from "react";
import TextTooltip from "../../app/common/tooltip/tooltip";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";
import DescriptorTypeInfo from "./descriptor-type-info";

interface DescriptorCalculatorModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const DescriptorCalculatorModal: React.FC<DescriptorCalculatorModalProps> = ({
	isOpen,
	onClose,
}) => {
	const { descriptorTypes } = useDescriptorTypes(); // Use the hook
	
	const [delta, setDelta] = useState<number>(100);
	const [phi, setPhi] = useState<number>(0.5);
	const [sigma, setSigma] = useState<number>(0);
	// const [particleCount, setParticleCount] = useState<number>(12);

	const descriptorMap = useMemo(() => {
		return Object.fromEntries(
			descriptorTypes
			.filter(d => d.name === "NumIntPores" || d.name === "Volume")
			.map(d => [d.name, d])
		);
	}, [descriptorTypes]);

	if (!isOpen) return null;

	// Calculations
	const xTotal = (delta + sigma) * Math.exp(phi);
	const totalPores = 0.405 * Math.exp(-0.0452 * xTotal);

	const xMedian = (delta + Math.sqrt(sigma)) * Math.sqrt(phi);
	const medianPoreVolume = 0.0234 * xMedian ** 2 - 0.595 * xMedian;

	// const A = 0.0563 * Math.exp(0.0369 * delta);
	// const B = 2.38 * Math.exp(0.0316 * delta);
	// const C = -10.4 * Math.exp(0.0309 * delta);
	// const interiorPoreVolume = A * particleCount ** 2 + B * particleCount + C;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded-lg shadow-lg max-w-xl w-full">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-gray-800">Descriptor Estimator</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
					>
						&times;
					</button>
				</div>
				
				<div className="text-sm text-gray-600 mb-4 leading-relaxed">
					We've identified strong correlations between scaffold descriptors and properties such as mean 
					particle diameter, void volume fraction, and the standard deviation of particle size. These relationships hold
					irrespective of particle shape and stiffness ({""}
					<a
						href="https://doi.org/10.1038/s43588-023-00551-x"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 hover:underline"
					>
						Riley et al., 2023
					</a>
					). Use this calculator to estimate descriptor values for your specific scaffold configuration.
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">
							<TextTooltip
								label="Avg. Particle Diameter, δ (µm)"
								tooltipText="Average diameter (µm) of a sphere with equivalent volume to the average particle volume"
							/>
						</label>
						<input
							type="number"
							step="any"
							min={0}
							value={delta}
							onChange={(e) => setDelta(parseFloat(e.target.value))}
							className="mt-1 w-full p-2 border rounded-md shadow-sm"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">
							<TextTooltip
								label="Void Volume Fraction, φ"
								tooltipText="Void volume fraction is 1 minus particle packing fraction."
							/>
						</label>
						<input
							type="number"
							step="any"
							value={phi}
							min={0}
							max={1}
							onChange={(e) => setPhi(parseFloat(e.target.value))}
							className="mt-1 w-full p-2 border rounded-md shadow-sm"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">Particle Diameter Std. Dev, σ (µm)</label>
						<input
							type="number"
							step="any"
							value={sigma}
							min={0}
							onChange={(e) => setSigma(parseFloat(e.target.value))}
							className="mt-1 w-full p-2 border rounded-md shadow-sm"
						/>
					</div>
					{/* <div>
						<label className="block text-sm font-medium text-gray-700">Surrounding Particle Count</label>
						<input
							type="number"
							step="1"
							min={0}
							value={particleCount}
							onChange={(e) => setParticleCount(parseInt(e.target.value))}
							className="mt-1 w-full p-2 border rounded-md shadow-sm"
						/>
					</div> */}
				</div>

				<div className="mt-6 space-y-2 text-gray-700 text-sm">
					<h2><strong>Estimates</strong></h2>
					<hr/>
					  	<div className="flex items-center space-x-2">
							<DescriptorTypeInfo
								label={descriptorMap?.NumIntPores?.label}
								imageUrl={descriptorMap?.NumIntPores?.imageUrl}
								tableLabel={descriptorMap?.NumIntPores?.tableLabel}
								description={descriptorMap?.NumIntPores?.description}
							/>
							<span>: {totalPores.toPrecision(3)}</span>
						</div>
						<div className="flex items-center space-x-2">
							<DescriptorTypeInfo
								label={'Median Interior Pore Volume (pL)'}
								imageUrl={descriptorMap?.Volume?.imageUrl}
								tableLabel={descriptorMap?.Volume?.tableLabel}
								description={descriptorMap?.Volume?.description}
							/>
							<span>: {medianPoreVolume.toPrecision(3)}</span>
						</div>
					{/* <p><strong>Median Interior Pore Volume (pL):</strong> {medianPoreVolume.toFixed(3)}</p> */}
					{/* <p><strong>Interior Pore Volume by Particle Count (pL):</strong> {interiorPoreVolume.toFixed(3)}</p> */}
				</div>
			</div>
		</div>
	);
};

export default DescriptorCalculatorModal;