import React, { useMemo, useState } from "react";
import TextTooltip from "../../app/common/tooltip/tooltip";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";
import DescriptorTypeInfo from "./descriptor-type-info";

const DescriptorCalculator: React.FC = () => {
  const { descriptorTypes } = useDescriptorTypes();
  const [delta, setDelta] = useState<number>(100);
  const [phi, setPhi] = useState<number>(0.5);
  const [sigma, setSigma] = useState<number>(0);
//   const [particleCount, setParticleCount] = useState<number>(12);

  const descriptorMap = useMemo(() => {
    return Object.fromEntries(
      descriptorTypes
        .filter((d) => d.name === "NumIntPores" || d.name === "Volume" || d.name === "LongestLength" || d.name === "AvgInternalDiam" || d.name === "LargestEnclosedSphereDiam")
        .map((d) => [d.name, d])
    );
  }, [descriptorTypes]);

  // --- calculations ---
  const xTotal = (delta + sigma) * Math.exp(phi);
  const totalPores = 0.405 * Math.exp(-0.0452 * xTotal);
  const xMedian = (delta + Math.sqrt(sigma)) * Math.sqrt(phi);
  const medianPoreVolume = 0.0234 * xMedian ** 2 - 0.595 * xMedian;
  const medianLongestLength = 1.32 * delta * Math.sqrt(phi);
  const medianAvgInternalDiameter = 0.45 * delta * Math.sqrt(phi);
  const medianLargestEnclosedSphere = 0.49 * delta * Math.sqrt(phi);
//   const A = 0.0563 * Math.exp(0.0369 * delta);
//   const B = 2.38 * Math.exp(0.0316 * delta);
//   const C = -10.4 * Math.exp(0.0309 * delta);
//   const interiorPoreVolume = A * particleCount ** 2 + B * particleCount + C;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
		<h1 className="text-2xl font-bold text-gray-800 mb-4">Calculate descriptors for your scaffold</h1>

		<p className="text-sm text-gray-600 mb-6 leading-relaxed">
			We've identified strong correlations between certain scaffold descriptors and properties such as mean
			particle diameter, void volume fraction, and the standard deviation of particle size. These relationships hold
			irrespective of particle shape and stiffness (
			<a
				href="https://doi.org/10.1038/s43588-023-00551-x"
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-600 hover:underline"
			>
			Riley et al., 2023
			</a>
			). Use this calculator to estimate descriptor values for your specific scaffold configuration.
		</p>

		<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
			{/* Inputs */}
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
					min={0}
					max={1}
					value={phi}
					onChange={(e) => setPhi(parseFloat(e.target.value))}
					className="mt-1 w-full p-2 border rounded-md shadow-sm"
				/>
			</div>
			<div>
				<label className="block text-sm font-medium text-gray-700">Particle Diameter Std. Dev, σ (µm)</label>
				<input
					type="number"
					step="any"
					min={0}
					value={sigma}
					onChange={(e) => setSigma(parseFloat(e.target.value))}
					className="mt-1 w-full p-2 border rounded-md shadow-sm"
				/>
			</div>
			{/* Optional */}
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

		<div className="text-gray-700 text-sm">
			<h2 className="font-semibold mb-2">Estimates</h2>
			<hr className="mb-3"/>
			<div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm text-gray-700">
				{/* Row 1: NumIntPores */}
				<DescriptorTypeInfo
					// label={descriptorMap?.NumIntPores?.label}
					label="# Interior 3D Pores (pL⁻¹)"
					imageUrl={descriptorMap?.NumIntPores?.imageUrl}
					tableLabel={
					descriptorMap?.NumIntPores
						? `${descriptorMap.NumIntPores.tableLabel}${descriptorMap.NumIntPores.unit ? ` (${descriptorMap.NumIntPores.unit})` : ""}`
						// ? `${descriptorMap.NumIntPores.tableLabel}(${'pL^-1'})`
						: ""
					}
					// tableLabel={'HELLO'}
					description={descriptorMap?.NumIntPores?.description}
				/>
				<span>{totalPores.toPrecision(3)}</span>

				{/* Row 2: Volume */}
				<DescriptorTypeInfo
					label="Median Interior Pore Volume (pL)"
					imageUrl={descriptorMap?.Volume?.imageUrl}
					tableLabel={
					descriptorMap?.Volume
						? `${descriptorMap.Volume.tableLabel}${descriptorMap.Volume.unit ? ` (${descriptorMap.Volume.unit})` : ""}`
						: ""
					}
					description={descriptorMap?.Volume?.description}
				/>
				<span>{medianPoreVolume.toPrecision(3)}</span>

				{/* Row 3: LongestLength */}
				<DescriptorTypeInfo
					label="Median Longest Length (µm)"
					imageUrl={descriptorMap?.LongestLength?.imageUrl}
					tableLabel={
					descriptorMap?.LongestLength
						? `${descriptorMap.LongestLength.tableLabel}${descriptorMap.LongestLength.unit ? ` (${descriptorMap.LongestLength.unit})` : ""}`
						: ""
					}
					description={descriptorMap?.LongestLength?.description}
				/>
				<span>{medianLongestLength.toPrecision(3)}</span>

				{/* Row 4: Median average internal diameter */}
				<DescriptorTypeInfo
					label="Median Avg Internal Diameter (µm)"
					imageUrl={descriptorMap?.AvgInternalDiam?.imageUrl}
					tableLabel={
					descriptorMap?.LongestLength
						? `${descriptorMap.AvgInternalDiam.tableLabel}${descriptorMap.AvgInternalDiam.unit ? ` (${descriptorMap.AvgInternalDiam.unit})` : ""}`
						: ""
					}
					description={descriptorMap?.AvgInternalDiam?.description}
				/>
				<span>{medianAvgInternalDiameter.toPrecision(3)}</span>

				{/* Row 4: Median average internal diameter */}
				<DescriptorTypeInfo
					label="Median Largest Enclosed Sphere Diameter (µm)"
					imageUrl={descriptorMap?.LargestEnclosedSphereDiam?.imageUrl}
					tableLabel={
					descriptorMap?.LargestEnclosedSphereDiam
						? `${descriptorMap.LargestEnclosedSphereDiam.tableLabel}${descriptorMap.LargestEnclosedSphereDiam.unit ? ` (${descriptorMap.LargestEnclosedSphereDiam.unit})` : ""}`
						: ""
					}
					description={descriptorMap?.LargestEnclosedSphereDiam?.description}
				/>
				<span>{medianLargestEnclosedSphere.toPrecision(3)}</span>
			</div>
      	</div>
    </div>
  );
};

export default DescriptorCalculator;