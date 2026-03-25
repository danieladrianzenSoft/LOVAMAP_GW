import React, { useMemo, useState } from "react";
import { FaCaretDown } from "react-icons/fa";
import Plot from "react-plotly.js";
import TextTooltip from "../../app/common/tooltip/tooltip";
import PlotlyLoader from "../../app/helpers/PlotlyLoader";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";
import ReactMarkdown from "react-markdown";
import Plotly from "../../app/helpers/PlotlyLoader";

const DescriptorCalculator: React.FC = () => {
  const { descriptorTypes } = useDescriptorTypes();
  const [delta, setDelta] = useState<number>(100);
  const [phi, setPhi] = useState<number>(0.5);
  const [sigma, setSigma] = useState<number>(0);
  const [expandedDescriptor, setExpandedDescriptor] = useState<string | null>(null);
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
  const medianPoreVolumeRaw = 0.0234 * xMedian ** 2 - 0.595 * xMedian;
  const medianPoreVolume = Math.max(0, medianPoreVolumeRaw);
  const medianLongestLength = 1.32 * delta * Math.sqrt(phi);
  const medianAvgInternalDiameter = 0.45 * delta * Math.sqrt(phi);
  const medianLargestEnclosedSphere = 0.49 * delta * Math.sqrt(phi);
//   const A = 0.0563 * Math.exp(0.0369 * delta);
//   const B = 2.38 * Math.exp(0.0316 * delta);
//   const C = -10.4 * Math.exp(0.0309 * delta);
//   const interiorPoreVolume = A * particleCount ** 2 + B * particleCount + C;

  const formatEstimate = (value: number): string => {
    if (!Number.isFinite(value)) {
      return "-";
    }
    return value.toPrecision(3);
  };

  const dataBasisRiley2023 = {
    particleDiameterRange: "40-200µm",
    particleShape: "Spheres, ellipsoids, rods, and nugget-like particles.",
    particleStiffness: "Rigid and deformable (spheres only)",
    containerShape: "Cube (validated on spherical containers)",
    particleSizeDispersity: "Monodisperse (validated on polydisperse distributions of spherical particles)",
	otherConditions: "Validated on conditions of decreased particle friction"
  };
  const dataBasisRiley2025 = {
    particleDiameterRange: "40-200µm",
    particleShape: "Spheres, ellipsoids, rods, and nugget-like particles.",
    particleStiffness: "Rigid and deformable (spheres only)",
    containerShape: "Cube",
    particleSizeDispersity: "Monodisperse",
  };

  const estimateRows = [
    {
      key: "NumIntPores",
      label: "# Interior 3D Pores (pL⁻¹)",
      value: formatEstimate(totalPores),
      descriptor: descriptorMap?.NumIntPores,
      transformLabel: "x = (δ + σ) e^φ",
      equation: "y = 0.405 e^(-0.0452x)",
      currentX: xTotal,
      getY: (x: number) => 0.405 * Math.exp(-0.0452 * x),
      xRange: [50, 200] as [number, number],
      yRange: [0, 0.03] as [number, number],
      dataBasis: dataBasisRiley2023,
      rSquared: "0.9827",
      sourceUrl: "https://doi.org/10.1038/s43588-023-00551-x",
      sourceLabel: "Riley et al., 2023",
    },
    {
      key: "Volume",
      label: "Median Interior Pore Volume (pL)",
      value: formatEstimate(medianPoreVolume),
      descriptor: descriptorMap?.Volume,
      transformLabel: "x = (δ + √σ) √φ",
      equation: "y = 0.0234x² - 0.595x",
      currentX: xMedian,
      getY: (x: number) => 0.0234 * x ** 2 - 0.595 * x,
      xRange: [20, 100] as [number, number],
      yRange: [0, 160] as [number, number],
      dataBasis: dataBasisRiley2023,
      rSquared: "0.9402",
      sourceUrl: "https://doi.org/10.1038/s43588-023-00551-x",
      sourceLabel: "Riley et al., 2023",
    },
    {
      key: "LongestLength",
      label: "Median Longest Length (µm)",
      value: formatEstimate(medianLongestLength),
      descriptor: descriptorMap?.LongestLength,
      transformLabel: "x = δ √φ",
      equation: "y = 1.32x",
      currentX: delta * Math.sqrt(phi),
      getY: (x: number) => 1.32 * x,
      xRange: [0, 90] as [number, number],
      yRange: [0, 125] as [number, number],
      dataBasis: dataBasisRiley2025,
      rSquared: "0.9492",
      sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12324226/",
      sourceLabel: "Riley et al., 2025",
    },
    {
      key: "AvgInternalDiam",
      label: "Median Avg Internal Diameter (µm)",
      value: formatEstimate(medianAvgInternalDiameter),
      descriptor: descriptorMap?.AvgInternalDiam,
      transformLabel: "x = δ √φ",
      equation: "y = 0.45x",
      currentX: delta * Math.sqrt(phi),
      getY: (x: number) => 0.45 * x,
      xRange: [0, 90] as [number, number],
      yRange: [0, 50] as [number, number],
      dataBasis: dataBasisRiley2025,
      rSquared: "0.9862",
      sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12324226/",
      sourceLabel: "Riley et al., 2025",
    },
    {
      key: "LargestEnclosedSphereDiam",
      label: "Median Largest Enclosed Sphere Diameter (µm)",
      value: formatEstimate(medianLargestEnclosedSphere),
      descriptor: descriptorMap?.LargestEnclosedSphereDiam,
      transformLabel: "x = δ √φ",
      equation: "y = 0.49x",
      currentX: delta * Math.sqrt(phi),
      getY: (x: number) => 0.49 * x,
      xRange: [0, 90] as [number, number],
      yRange: [0, 50] as [number, number],
      dataBasis: dataBasisRiley2025,
      rSquared: "0.9802",
      sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12324226/",
      sourceLabel: "Riley et al., 2025",
    },
  ];

  const longestLabelLength = Math.max(...estimateRows.map((row) => row.label.length), 0);

  const onDescriptorClick = (key: string) => {
    setExpandedDescriptor((previous) => (previous === key ? null : key));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
		<h1 className="text-2xl font-bold text-gray-800 mb-4">Calculate descriptors for your scaffold</h1>

		<p className="text-sm text-gray-600 mb-6 leading-relaxed">
			We've identified strong correlations between certain scaffold descriptors and properties such as mean
			particle diameter, void volume fraction, and the standard deviation of particle size. These relationships hold
			for various particle shapes and stiffnesses (
			<a
				href="https://doi.org/10.1038/s43588-023-00551-x"
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-600 hover:underline"
			>
			Riley et al., 2023
			</a>{", "}
			<a
				href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12324226/"
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-600 hover:underline"
			>
			Riley et al., 2025
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
					step="10"
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
					step="0.1"
					min={0}
					max={1}
					value={phi}
					onChange={(e) => {
						const parsed = parseFloat(e.target.value);
						if (Number.isNaN(parsed)) {
							setPhi(Number.NaN);
							return;
						}
						setPhi(Math.min(1, Math.max(0, parsed)));
					}}
					className="mt-1 w-full p-2 border rounded-md shadow-sm"
				/>
			</div>
			<div>
				<label className="block text-sm font-medium text-gray-700">Particle Diameter Std. Dev, σ (µm)</label>
				<input
					type="number"
					step="5"
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
			<p className="text-xs text-gray-500 mb-3">
				Click a descriptor to view definition details and correlation context.
			</p>
			<div className="space-y-2">
				{estimateRows.map((row) => {
					const isExpanded = expandedDescriptor === row.key;
					const tableLabel = row.descriptor
						? `${row.descriptor.tableLabel}${row.descriptor.unit ? ` (${row.descriptor.unit})` : ""}`
						: "";
					const xStart = row.xRange[0];
					const xEnd = row.xRange[1];
					const xStep = (xEnd - xStart) / 79;
					const xValues = Array.from({ length: 80 }, (_, idx) => xStart + idx * xStep);
					const yValues = xValues.map((x) => row.getY(x));
					const currentY = row.getY(row.currentX);
					const hasCurrentPoint = Number.isFinite(row.currentX) && Number.isFinite(currentY);

					return (
						<div key={row.key} className="rounded-md">
							<button
								type="button"
								onClick={() => onDescriptorClick(row.key)}
								className={`w-full text-left px-2 py-2 transition-colors rounded-md ${
									isExpanded ? "bg-gray-50" : "bg-white hover:bg-gray-50"
								}`}
								aria-expanded={isExpanded}
							>
								<div className="flex items-center gap-4">
									<span
										className="text-gray-800 shrink-0"
										style={{ width: `${longestLabelLength + 2}ch` }}
									>
										{row.label}
									</span>
									<span className="font-medium text-gray-700 text-left min-w-[7ch]">{row.value}</span>
									<div
										className={`ml-auto text-gray-600 text-xl leading-none transform transition-transform duration-300 ${
											isExpanded ? "rotate-0" : "rotate-[-90deg]"
										}`}
										aria-hidden="true"
									>
										<FaCaretDown />
									</div>
								</div>
							</button>

							{isExpanded && (
								<div className="mt-2 rounded-md p-4 bg-white">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<div className="font-semibold text-gray-800 mb-2">{tableLabel || row.label}</div>

											{row.descriptor?.imageUrl && (
												<img
													src={row.descriptor.imageUrl}
													alt={tableLabel || row.label}
													className="w-full h-auto max-h-40 object-contain mb-3 rounded bg-white"
												/>
											)}

											<div className="text-xs text-gray-600">
												<ReactMarkdown className="markdown-content">
													{row.descriptor?.description || "No definition available yet."}
												</ReactMarkdown>
											</div>
											<div className="text-xs text-gray-500 mt-3">
												<p className="font-semibold text-gray-700">Data basis for fit</p>
												<p className="mt-1">
													<span className="font-medium text-gray-700">Particle diameter range:</span>{" "}
													{row.dataBasis.particleDiameterRange}
												</p>
												<p>
													<span className="font-medium text-gray-700">Particle shape:</span> {row.dataBasis.particleShape}
												</p>
												<p>
													<span className="font-medium text-gray-700">Particle stiffness:</span>{" "}
													{row.dataBasis.particleStiffness}
												</p>
												<p>
													<span className="font-medium text-gray-700">Container shape:</span>{" "}
													{row.dataBasis.containerShape}
												</p>
												<p>
													<span className="font-medium text-gray-700">Particle size dispersity:</span>{" "}
													{row.dataBasis.particleSizeDispersity}
												</p>
												<p className="font-semibold text-gray-700 mt-2">R²</p>
												<p>{row.rSquared}</p>
												<p className="font-semibold text-gray-700 mt-2">Source</p>
												<p>
													<a
														href={row.sourceUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 hover:underline"
													>
														{row.sourceLabel}
													</a>
												</p>
											</div>
										</div>

										<div className="rounded-md bg-white min-h-[220px] p-2">
											<div className="text-xs font-medium text-gray-700 px-2 pt-1">
												<span>{row.equation}</span>
											</div>
											<Plot
												data={
													[
														{
															type: "scatter",
															mode: "lines",
															x: xValues,
															y: yValues,
															line: { color: "#2563EB", width: 2 },
															hovertemplate: `${row.transformLabel}<br>x=%{x:.3f}<br>y=%{y:.3f}<extra></extra>`,
															name: row.label,
														},
														...(hasCurrentPoint
															? [
																	{
																		type: "scatter",
																		mode: "markers",
																		x: [row.currentX],
																		y: [currentY],
																		marker: { color: "#DC2626", size: 8 },
																		hovertemplate: `Current inputs<br>x=%{x:.3f}<br>y=%{y:.3f}<extra></extra>`,
																		name: "Current",
																	},
															  ]
															: []),
													]
												}
												layout={{
													autosize: true,
													margin: { t: 16, r: 16, b: 48, l: 56 },
													showlegend: false,
													hovermode: "closest",
													xaxis: {
														title: { text: row.transformLabel, font: { size: 11, color: "#4B5563" } },
														range: row.xRange,
														tickfont: { size: 11 },
														zeroline: false,
														showgrid: true,
														gridcolor: "#E5E7EB",
													},
													yaxis: {
														title: { text: row.label, font: { size: 11, color: "#4B5563" } },
														range: row.yRange,
														tickfont: { size: 11 },
														zeroline: false,
														showgrid: true,
														gridcolor: "#E5E7EB",
													},
													paper_bgcolor: "#FFFFFF",
													plot_bgcolor: "#FFFFFF",
												}}
												config={{
													responsive: true,
													displayModeBar: false,
													scrollZoom: false,
													displaylogo: false,
												}}
												style={{ width: "100%", height: "230px" }}
												useResizeHandler
												revision={Number.isFinite(row.currentX) ? Math.round(row.currentX * 1000) : 0}
												plotly={PlotlyLoader}
											/>
										</div>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
      	</div>
    </div>
  );
};

export default DescriptorCalculator;
