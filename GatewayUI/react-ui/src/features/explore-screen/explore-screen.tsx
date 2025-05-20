import React, {useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
import { FaSpinner } from 'react-icons/fa';
import ScaffoldGroupsFilterResults from "../scaffold-groups/scaffold-group-filter-results";
import { useScaffoldGroupFiltering } from "../../app/common/hooks/useScaffoldGroupFiltering";
import AISearchBar from "../../app/common/ai-search-bar/ai-seach-bar";
import { SearchContextSummary } from "../../app/common/ai-search-bar/search-context-summary";

const ExploreScreen = () => {
	const { commonStore, scaffoldGroupStore } = useStore();
	const isLoggedIn = commonStore.isLoggedIn;
	const {
		scaffoldGroups,
		segmentedScaffoldGroups: { exact, related }
	} = scaffoldGroupStore
	const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const toggleDetails = (id: number) => {
		setVisibleDetails(prev => (prev === id ? null : id));
	};

	const {
		selectedParticleSizeIds,
		setSelectedParticleSizeIds,
		selectedTags,
		setSelectedTags,
		selectedTagNames,
		removeFilterTag,
		loadAIResults,
		aiSearchUsed,
		setAiSearchUsed,
	} = useScaffoldGroupFiltering(isLoggedIn, setIsLoading);

	const clearFilters = () => {
		setSelectedTags({});
		setSelectedParticleSizeIds([]);
		setAiSearchUsed(false);
	};

	return (
		<div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
			<div className="text-3xl text-gray-700 font-bold mb-12">
				Explore {isLoggedIn ? "scaffolds" : "public scaffolds"}
			</div>

			<div className="mb-4">
				<AISearchBar onSearch={loadAIResults} onClear={clearFilters}/>
				<SearchContextSummary aiSearchUsed={aiSearchUsed} selectedTagNames={selectedTagNames} selectedParticleSizeIds={selectedParticleSizeIds}/>
			</div>


			<ScaffoldGroupFilters 
				setIsLoading={setIsLoading} 
				condensed={true} 
				allFiltersVisible={false}
				selectedParticleSizeIds={selectedParticleSizeIds}
				setSelectedParticleSizeIds={setSelectedParticleSizeIds}
				selectedTags={selectedTags}
				setSelectedTags={setSelectedTags}
			/>

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
						onRemoveTag={removeFilterTag}
						largeScreenColumns={3}
					/>
				</>
			)}
		</div>
	);
};

export default observer(ExploreScreen);

