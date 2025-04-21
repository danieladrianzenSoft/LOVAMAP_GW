import React, {useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
// import ScaffoldGroupDetails from "../scaffold-groups/scaffold-group-details";
import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
// import ScaffoldGroupCard from "../scaffold-groups/scaffold-group-card";
import { FaSpinner } from 'react-icons/fa';
// import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import ScaffoldGroupsFilterResults from "../scaffold-groups/scaffold-group-filter-results";

const ExploreScreen = () => {
	const { commonStore, scaffoldGroupStore } = useStore();
	const isLoggedIn = commonStore.isLoggedIn;
	const {
		scaffoldGroups,
		selectedTagNames,
		selectedParticleSizeIds,
		segmentedScaffoldGroups: { exact, related }
	} = scaffoldGroupStore;

	const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const toggleDetails = (id: number) => {
		setVisibleDetails(prev => (prev === id ? null : id));
	};

	// Count total filters (tags + particle sizes)
	// const totalFilterCount = selectedTagNames.length + selectedParticleSizeIds.length;

	// 👇 Reusable rendering function
	// const renderGroups = (
	// 	groups: ScaffoldGroup[],
	// 	showHeader: boolean,
	// 	headerText?: string,
	// 	emptyMessage?: string
	// ) => {
	// 	if (groups.length === 0 && !emptyMessage) return null;

	// 	return (
	// 		<div className="mb-12">
	// 			{showHeader && headerText && (
	// 				<h2 className="text-2xl font-semibold text-gray-800 mb-6">{headerText}</h2>
	// 			)}
	// 			{groups.length === 0 && emptyMessage && (
	// 				<p className="text-gray-500 mb-4">{emptyMessage}</p>
	// 			)}

	// 			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
	// 				{groups.map(scaffoldGroup => (
	// 					<ScaffoldGroupCard
	// 						key={scaffoldGroup.id}
	// 						scaffoldGroup={scaffoldGroup}
	// 						isVisible={visibleDetails === scaffoldGroup.id}
	// 						toggleDetails={() => toggleDetails(scaffoldGroup.id)}
	// 					/>
	// 				))}
	// 			</div>

	// 			{visibleDetails &&
	// 				groups.some(sg => sg.id === visibleDetails) && (
	// 					<div className="transition-opacity duration-500 ease-in-out transform opacity-100 scale-100 overflow-hidden mt-6">
	// 						<ScaffoldGroupDetails
	// 							scaffoldGroup={groups.find(sg => sg.id === visibleDetails)!}
	// 							isVisible={true}
	// 							toggleDetails={() => visibleDetails && toggleDetails(visibleDetails)}
	// 						/>
	// 					</div>
	// 				)}
	// 		</div>
	// 	);
	// };

	return (
		<div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
			<div className="text-3xl text-gray-700 font-bold mb-12">
				Explore {isLoggedIn ? "scaffolds" : "public scaffolds"}
			</div>

			<ScaffoldGroupFilters setIsLoading={setIsLoading} />

			{isLoading ? (
				<div className="flex justify-center items-center py-8">
					<FaSpinner className="animate-spin" size={40} />
				</div>
			) : (
				<>
					<ScaffoldGroupsFilterResults
						scaffoldGroups={scaffoldGroups}
						exact={exact}
						related={related}
						visibleDetails={visibleDetails}
						toggleDetails={toggleDetails}
						selectedTagNames={selectedTagNames}
						selectedParticleSizeIds={selectedParticleSizeIds}
						largeScreenColumns={3}
					/>
				</>
			)}
		</div>
	);
};

export default observer(ExploreScreen);

//     const { commonStore, scaffoldGroupStore } = useStore();
// 	const isLoggedIn = commonStore.isLoggedIn;
//     const { scaffoldGroups } = scaffoldGroupStore;
// 	const { exact, related } = scaffoldGroupStore.segmentedScaffoldGroups;
//     const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
//     const [numberOfColumns, setNumberOfColumns] = useState(3);
// 	const [isLoading, setIsLoading] = useState<boolean>(false);

//     useEffect(() => {
//         const updateNumberOfColumns = () => {
//             const width = window.innerWidth;
//             if (width < 640) setNumberOfColumns(1);
//             else if (width < 768) setNumberOfColumns(2);
//             else setNumberOfColumns(3);
//         };
//         window.addEventListener('resize', updateNumberOfColumns);
//         updateNumberOfColumns();
//         return () => window.removeEventListener('resize', updateNumberOfColumns);
//     }, []);

//     const toggleDetails = (id: number) => {
//         setVisibleDetails(prev => prev === id ? null : id);
//     };

//     const rows = [];
//     for (let i = 0; i < scaffoldGroups?.length; i += numberOfColumns) {
//         rows.push(scaffoldGroups.slice(i, i + numberOfColumns));
//     }

//     return (
//         <div className={`container mx-auto py-8 px-4 sm:px-6 lg:px-8`}>
// 			{!isLoggedIn && <div className="text-3xl text-gray-700 font-bold mb-12">Explore public scaffolds</div>}
// 			{isLoggedIn && <div className="text-3xl text-gray-700 font-bold mb-12">Explore scaffolds</div>}
// 			<div className="w-full">
// 				<ScaffoldGroupFilters setIsLoading={setIsLoading} />
// 				{isLoading ? (
// 					<div className="flex justify-center items-center py-8">
// 						<FaSpinner className="animate-spin" size={40} />
// 					</div>
// 					) : (
// 					<div>
// 						{rows.map((row, index) => (
// 							<React.Fragment key={row.map(sg => sg.id).join('-')}>
// 								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
// 									{row.map(scaffoldGroup => (
// 										<ScaffoldGroupCard
// 											key={scaffoldGroup.id}
// 											scaffoldGroup={scaffoldGroup}
// 											isVisible={visibleDetails === scaffoldGroup.id}
// 											toggleDetails={() => toggleDetails(scaffoldGroup.id)}
// 										/>
// 									))}
// 								</div>
// 								{row.some(sg => sg.id === visibleDetails) && (
// 									<div className={`transition-opacity duration-500 ease-in-out transform ${visibleDetails ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} overflow-hidden`}>
// 										<ScaffoldGroupDetails
// 											scaffoldGroup={row.find(sg => sg.id === visibleDetails)!}
// 											isVisible={true}
// 											toggleDetails={() => visibleDetails && toggleDetails(visibleDetails)}
// 										/>
// 									</div>
// 								)}
// 							</React.Fragment>
// 						))}
// 					</div>
// 				)}
// 			</div>
//         </div>
//     );
// };

// export default observer(ExploreScreen);