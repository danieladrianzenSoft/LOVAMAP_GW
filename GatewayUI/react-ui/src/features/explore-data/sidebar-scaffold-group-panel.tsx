import { useState } from "react";
import { ScaffoldGroupData } from "../../app/models/scaffoldGroupData";
import Tag from "../../app/common/tag/tag";
import React from "react";
import { FaTimes } from "react-icons/fa";
import { getPlotColor } from "../../app/utils/plot-colors";

interface SidebarScaffoldGroupPanelProps {
	groupData: ScaffoldGroupData;
	index: number;
	numPlots: number;
	onRemove?: (groupId: number) => void;
}

const categoryOrder: { [key: string]: number } = {
	Particles: 0,
    ExteriorPores: 1,
    InteriorPores: 2,
    ParticleSizeDistribution: 3,
    Other: 4
};

export const SidebarScaffoldGroupPanel: React.FC<SidebarScaffoldGroupPanelProps> = ({ groupData, index, numPlots, onRemove }) => {
	const [isOpen, setIsOpen] = useState(true);
	const toggleOpen = () => setIsOpen(prev => !prev);

	return (
		<div className="bg-white bg-opacity-80 rounded-lg shadow mb-4 w-ful hover:shadow-lg">
		<div
			className={`flex justify-between items-center cursor-pointer transition-all duration-300 ${
				isOpen ? "border-b border-gray-300 px-2 pt-2 pb-4" : "px-2 pt-2"
			}`}
			onClick={toggleOpen}
		>
			{/* Header row */}
			<div className="flex justify-between items-start">
				{/* Group name and tags */}
				<div className="flex-1">
					<div className="w-full">
						<div className="flex items-center">
							{onRemove && (
								<button
										className="bg-gray-200 text-gray-600 p-1.5 rounded-full mr-2 text-xs hover:shadow-md hover:text-red-600"
										onClick={(e) => {
										e.stopPropagation();
										onRemove(groupData.scaffoldGroup.id);
									}}
									title="Remove scaffold group"
								>
									<FaTimes size={10} />
								</button>
							)}
							<h2 className="text-sm font-bold text-gray-800 break-words">
								<span
									className="inline-block w-3 h-3 rounded-sm mr-2 align-middle"
									style={{
									backgroundColor: getPlotColor(index, numPlots),
									flexShrink: 0,
									}}
								/>
								{`Scaffold Group ${index + 1}`}
							</h2>
						</div>
						<div className="mt-1">
							<h2 className="text-sm font-semibold text-gray-700 break-words">
								{groupData.scaffoldGroup.name}
							</h2>
						</div>
					</div>
					<div className="flex flex-wrap gap-1 mt-2">
						{groupData.scaffoldGroup.tags.map((tag, index) => (
						<Tag key={index} text={tag} />
						))}
					</div>
				</div>
			</div>
		</div>

		<div
			className={`transition-all duration-300 ease-in-out overflow-hidden p-2 ${
			isOpen ? "max-h-[1000px] opacity-100 mt-1" : "max-h-0 opacity-0"
			}`}
		>
			{groupData.scaffoldGroup.images.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{groupData.scaffoldGroup.images
						.slice() // Create a copy to avoid mutating the original array
						.sort((a, b) => {
							// Use categoryOrder mapping, defaulting to 999 if category is unrecognized
							const orderA = categoryOrder[a.category] ?? 999;
							const orderB = categoryOrder[b.category] ?? 999;
							return orderA - orderB;
						})
						.map((image, index) => (
							<div key={index} className="flex flex-col items-center">
							<div
								className="relative w-full h-36 group overflow-hidden rounded-lg transition-shadow duration-300"
							>
								{/* Top-centered category label */}
								<p className="absolute left-1/2 top-2 transform -translate-x-1/2 bg-white bg-opacity-70 text-sm text-gray-700 px-2 py-0.5 rounded z-10">
									{image.category}
								</p>

								{/* Image */}
								<img 
									src={image.url} 
									alt={image.category} 
									className="w-full h-full object-cover transition-transform duration-300"
								/>
							</div>
						</div>
					))}
				</div>
			) : (
				<>
					<p className="text-sm text-gray-500 italic">No figures added</p>
				</>
			)}
			<table className="w-full text-sm text-left text-gray-500">
				<tbody>
					<tr>
						<td className="font-medium text-gray-900 align-top w-28">Id:</td>
						<td>{groupData.scaffoldGroup.id}</td>
					</tr>
					<tr>
						<td className="font-medium text-gray-900 align-top">Simulated:</td>
						<td>{groupData.scaffoldGroup.isSimulated ? "yes" : "no"}</td>
					</tr>
					<tr>
						<td className="font-medium text-gray-900 align-top">Shape:</td>
						<td>{groupData.scaffoldGroup.inputs?.containerShape ?? "n/a"}</td>
					</tr>
					<tr>
						<td className="font-medium text-gray-900 align-top">Packing:</td>
						<td>{groupData.scaffoldGroup.inputs?.packingConfiguration ?? "unknown"}</td>
					</tr>
					<tr>
						<td className="font-medium text-gray-900 align-top">Particles:</td>
						<td>
							<table className="text-xs w-full text-left">
								<tbody>
									{groupData.scaffoldGroup.inputs?.particles?.map((p, index) => (
										<React.Fragment key={index}>
										<tr>
											<td className="font-bold" colSpan={2}>
											{(p.proportion * 100).toPrecision(3)}% {p.meanSize.toPrecision(3)}μm{" "}
											{p.shape}
											</td>
										</tr>
										<tr>
											<td className="pl-2 text-gray-500">stiffness:</td>
											<td>{p.stiffness}</td>
										</tr>
										<tr>
											<td className="pl-2 text-gray-500">dispersity:</td>
											<td>{p.dispersity}</td>
										</tr>
										<tr>
											<td className="pl-2 text-gray-500">distribution:</td>
											<td>{p.sizeDistributionType}</td>
										</tr>
										<tr>
											<td className="pl-2 text-gray-500">σ diameter:</td>
											<td>{p.standardDeviationSize.toPrecision(3)} μm</td>
										</tr>
										</React.Fragment>
									))}
								</tbody>
							</table>
						</td>
					</tr>
					<tr>
						<td className="font-medium text-gray-900 align-top">Replicates:</td>
						<td>{groupData.scaffoldGroup.numReplicates}</td>
					</tr>
				</tbody>
			</table>
		</div>
		</div>
	);
};