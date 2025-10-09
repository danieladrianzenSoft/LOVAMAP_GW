import React, { useEffect, useState } from "react";
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
	// const {scaffoldGroupStore} = useStore();

	// const handleRemoveTag = ((tag: string) => {
	// 	console.log(tag);
	// 	scaffoldGroupStore.removeFilterTag(tag);
	// })

	useEffect(() => {
		const handleResize = () => {
			const width = window.innerWidth;
			if (width < 640) setNumberOfColumns(1);
			else if (width < 1024) setNumberOfColumns(2);
			else setNumberOfColumns(largeScreenColumns);
		};

		handleResize(); // set initial value
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [largeScreenColumns]);

	useEffect(() => {
		if (!visibleDetails) return;

		const id = `scaffold-details-${visibleDetails}`;
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
			<div className="space-y-2">
				{rows.map((row, index) => {
					const detailGroup = row.find(sg => sg.id === visibleDetails);
	
					return (
						<React.Fragment key={index}>
							<div className={`flex flex-wrap gap-0`}>
								{row.map(scaffoldGroup => {
									const isSelected = selectedScaffoldGroups?.some(group => group.id === scaffoldGroup.id) ?? false;
									
									return (
										<div
											className={`w-full sm:w-1/2 ${largeScreenColumns === 3 ? "lg:w-1/3" : "lg:w-1/2"}`}
											key={scaffoldGroup.id}
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
											/>
										</div>
										
									);
								})}
							</div>
	
							{detailGroup && (
								<div className="w-full scaffold-details" id={`scaffold-details-${detailGroup.id}`}>
									<ScaffoldGroupDetails
										scaffoldGroup={detailGroup}
										isVisible={true}
										toggleDetails={() => toggleDetails(detailGroup.id)}
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
		<div className="col-span-3 px-3 space-y-12">
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