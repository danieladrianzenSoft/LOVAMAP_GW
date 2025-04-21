import React, { useEffect, useState } from "react";
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import ScaffoldGroupCard from "./scaffold-group-card"; // adjust path if different
import ScaffoldGroupDetails from "./scaffold-group-details";

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
	selectedTagNames,
	selectedParticleSizeIds,
	largeScreenColumns = 3,
}) => {
	const totalFilters = selectedTagNames.length + selectedParticleSizeIds.length;
	const [numberOfColumns, setNumberOfColumns] = useState(3);

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
							<div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${largeScreenColumns}`}>
								{row.map(scaffoldGroup => {
									const isSelected = selectedScaffoldGroups?.some(group => group.id === scaffoldGroup.id) ?? false;
	
									return (
										<ScaffoldGroupCard
											key={scaffoldGroup.id}
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
									);
								})}
							</div>
	
							{detailGroup && (
								<div className="w-full">
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
				<>
					<h2 className="text-2xl font-semibold text-gray-800 mt-10">Exact Matches</h2>
					{exact.length > 0
						? renderCards(exact)
						: <p className="text-gray-500">No scaffold groups fit all the filter criteria.</p>
					}

					{related.length > 0 && (
						<>
							<h2 className="text-2xl font-semibold text-gray-800">Related Results</h2>
							{renderCards(related)}
						</>
					)}
				</>
			)}
		</div>
	);
};

export default ScaffoldGroupsFilterResults;