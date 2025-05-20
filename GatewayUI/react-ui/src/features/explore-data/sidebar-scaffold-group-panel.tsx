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
					<div className="flex items-center w-full">
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
						<h2 className="text-sm font-semibold text-gray-800 break-words">
							<span
								className="inline-block w-3 h-3 rounded-sm mr-2 align-middle"
								style={{
								backgroundColor: getPlotColor(index, numPlots),
								flexShrink: 0,
								}}
							/>
							{groupData.scaffoldGroup.name}
						</h2>
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