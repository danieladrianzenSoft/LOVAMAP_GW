import React, { useEffect, useRef, useState } from "react";
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import ScaffoldGroupCard from "./scaffold-group-card"; // adjust path if different
import ScaffoldGroupDetails from "./scaffold-group-details";
import Tag from "../../app/common/tag/tag";

interface ScaffoldGroupsFilterResultsProps {
	scaffoldGroups: ScaffoldGroup[];
	exact: ScaffoldGroup[];
	related: ScaffoldGroup[];
	visibleDetails: number | null;
	toggleDetails: (id: number) => void;
	selectedTagNames: string[];
	selectedParticleSizeIds: number[];
	largeScreenColumns?: number;

	// Optional selection behavior
	selectedScaffoldGroups?: ScaffoldGroup[];
	onSelect?: (group: ScaffoldGroup) => void;
	onUnselect?: (groupId: number) => void;
	onRemoveTag?: (tag: string) => void;

}

const ScaffoldGroupsFilterResults: React.FC<ScaffoldGroupsFilterResultsProps> = ({
	scaffoldGroups,
	exact,
	related,
	selectedScaffoldGroups,
	visibleDetails,
	toggleDetails,
	onSelect,
	onUnselect,
	onRemoveTag,
	selectedTagNames,
	selectedParticleSizeIds,
	largeScreenColumns = 3,
}) => {
	const totalFilters = selectedTagNames.length + selectedParticleSizeIds.length;
	const [numberOfColumns, setNumberOfColumns] = useState(3);
	const containerRef = useRef<HTMLDivElement>(null);
	// const {scaffoldGroupStore} = useStore();

	// const handleRemoveTag = ((tag: string) => {
	// 	console.log(tag);
	// 	scaffoldGroupStore.removeFilterTag(tag);
	// })

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const updateCols = (width: number) => {
			if (width < 560) setNumberOfColumns(1);
			else if (width < 860) setNumberOfColumns(Math.min(2, largeScreenColumns));
			else if (width < 1140) setNumberOfColumns(Math.min(3, largeScreenColumns));
			else setNumberOfColumns(largeScreenColumns);
		};

		updateCols(el.getBoundingClientRect().width);
		const ro = new ResizeObserver((entries) => {
			updateCols(entries[0].contentRect.width);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [largeScreenColumns]);

	useEffect(() => {
		if (!visibleDetails) return;

		const id = `scaffold-card-${visibleDetails}`;
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}, [visibleDetails]);

	const renderCards = (groups: ScaffoldGroup[]) => {
		const columns = numberOfColumns;
	
		const rows: ScaffoldGroup[][] = [];
		for (let i = 0; i < groups.length; i += columns) {
			rows.push(groups.slice(i, i + columns));
		}
	
		return (
			<div>
				{rows.map((row, index) => {
					const detailGroup = row.find(sg => sg.id === visibleDetails);
					const detailColumnIndex = detailGroup ? row.indexOf(detailGroup) : -1;
					const squareTopLeft = detailColumnIndex === 0;
					const squareTopRight = detailColumnIndex === row.length - 1;

					return (
						<React.Fragment key={index}>
							<div className={`flex flex-wrap gap-0`}>
								{row.map((scaffoldGroup, columnIndex) => {
									const isSelected = selectedScaffoldGroups?.some(group => group.id === scaffoldGroup.id) ?? false;

									const isDetailOpen = visibleDetails === scaffoldGroup.id;
									const hasLeftNeighbor = columnIndex > 0;
									const hasRightNeighbor = columnIndex < row.length - 1;
									return (
										<div
											className="relative p-1.5"
											style={{ width: `${100 / numberOfColumns}%` }}
											key={scaffoldGroup.id}
											id={`scaffold-card-${scaffoldGroup.id}`}
										>
											<ScaffoldGroupCard
												scaffoldGroup={scaffoldGroup}
												isVisible={visibleDetails === scaffoldGroup.id}
												toggleDetails={() => toggleDetails(scaffoldGroup.id)}
												isSelected={isSelected}
												isSelectable={!!onSelect && !!onUnselect}
												onSelect={() =>
													isSelected
														? onUnselect?.(scaffoldGroup.id)
														: onSelect?.(scaffoldGroup)
												}
												columns={numberOfColumns}
											/>
											{isDetailOpen && (
												<>
													{/* Center bridge: fills the vertical gap beneath the card */}
													<div
														aria-hidden="true"
														className="absolute left-1.5 right-1.5 -bottom-2.5 h-4 bg-white z-10 pointer-events-none"
													/>
													{/* Left concave bezel: curves outward-and-down from card's bottom-left into details */}
													{hasLeftNeighbor && (
														<div
															aria-hidden="true"
															className="absolute -left-2.5 -bottom-2.5 w-4 h-4 z-10 pointer-events-none"
															style={{ background: 'radial-gradient(circle 16px at 0% 0%, transparent 16px, white 16px)' }}
														/>
													)}
													{/* Right concave bezel: mirror on card's bottom-right */}
													{hasRightNeighbor && (
														<div
															aria-hidden="true"
															className="absolute -right-2.5 -bottom-2.5 w-4 h-4 z-10 pointer-events-none"
															style={{ background: 'radial-gradient(circle 16px at 100% 0%, transparent 16px, white 16px)' }}
														/>
													)}
												</>
											)}
										</div>

									);
								})}
							</div>

							{detailGroup && (
								<div className="w-full p-1.5 mt-1 scaffold-details" id={`scaffold-details-${detailGroup.id}`}>
									<ScaffoldGroupDetails
										scaffoldGroup={detailGroup}
										isVisible={true}
										toggleDetails={() => toggleDetails(detailGroup.id)}
										squareTopLeft={squareTopLeft}
										squareTopRight={squareTopRight}
									/>
								</div>
							)}
						</React.Fragment>
					);
				})}
			</div>
		);
	};
	
	return (
		<div ref={containerRef} className="col-span-3 space-y-12">
			{totalFilters === 0 && renderCards(scaffoldGroups)}

			{totalFilters >= 1 && (
				<div>
					<h2 className="text-2xl font-semibold text-gray-800 mt-10">Exact Matches</h2>
					<div className="flex flex-wrap gap-x-1 gap-y-1 mt-2 mb-8">
						{selectedTagNames.map((tag, index) => (
							<Tag key={index} showRemove={true} onRemove={onRemoveTag} text={tag} />
						))}
						{selectedParticleSizeIds.map((tag, index) => (
							<Tag key={index} showRemove={true} onRemove={onRemoveTag} text={tag.toString() + "um"} />
						))}
					</div>
					{exact.length > 0
						? renderCards(exact)
						: <p className="text-gray-500">No scaffold groups fit all the filter criteria.</p>
					}

					{related.length > 0 && (
						<div className="mt-14">
							<h2 className="text-2xl font-semibold text-gray-800 mb-8">Related Results</h2>
							{renderCards(related)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default ScaffoldGroupsFilterResults;