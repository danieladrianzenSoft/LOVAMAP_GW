import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
import ScaffoldGroupsFilterResults from "../scaffold-groups/scaffold-group-filter-results";
import { useScaffoldGroupFiltering } from "../../app/common/hooks/useScaffoldGroupFiltering";
import AISearchBar from "../../app/common/ai-search-bar/ai-seach-bar";
import { SearchContextSummary } from "../../app/common/ai-search-bar/search-context-summary";
import { useSearchParams } from "react-router-dom";
import { Publication } from "../../app/models/publication";
import ReactMarkdown from "react-markdown";
import LoadingSpinner from '../../app/common/loading-spinner/loading-spinner';

const ExploreScreen = () => {
	const { commonStore, scaffoldGroupStore, publicationStore } = useStore();
	const isLoggedIn = commonStore.isLoggedIn;
	const {
		scaffoldGroups,
		segmentedScaffoldGroups: { exact, related }
	} = scaffoldGroupStore;
	const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [publication, setPublication] = useState<Publication | null>(null);



	const toggleDetails = (id: number) => {
		setVisibleDetails(prev => (prev === id ? null : id));
	};

	const [searchParams] = useSearchParams();
	const initialScope = useMemo(() => {
		const pubId = searchParams.get("publicationId");
		const dsId = searchParams.get("publicationDatasetId");
		const restrict = searchParams.get("restrictToPublicationDataset") === "true";
		return {
			publicationId: pubId ? Number(pubId) : undefined,
			publicationDatasetId: dsId ? Number(dsId) : undefined,
			restrictToPublicationDataset: restrict,
			skipFirstUnscoped: restrict && (!!pubId || !!dsId),
		};
	}, [searchParams]);

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
		publicationId,
		restrictToPublicationDataset,
		isPublicationScoped,
		isSimulated,
		setIsSimulated,
	} = useScaffoldGroupFiltering(isLoggedIn, setIsLoading, initialScope);

	useEffect(() => {
		const fetchPublication = async () => {
			setIsLoading(true);
			try {
				if (restrictToPublicationDataset && publicationId) {
					const publication = await publicationStore.getPublication(publicationId);
					setPublication(publication);
				}
			} catch (error) {
				console.error("Error fetching publication:", error);
			} finally {
				setIsLoading(false);
			}
		};
		fetchPublication();
	}, [publicationId, publicationStore, restrictToPublicationDataset]);



	const clearFilters = () => {
		setSelectedTags({});
		setSelectedParticleSizeIds([]);
		setIsSimulated(null);
		setAiSearchUsed(false);
	};


	return (
		<div className="container mx-auto py-8 px-6">
			<div className="text-3xl text-gray-700 font-bold mb-12">
				{isPublicationScoped
					? `Data from Publication`
					: `Explore ${isLoggedIn ? "scaffolds" : "public scaffolds"}`}
			</div>

			{isPublicationScoped && publication && (
				<div className="text-xl text-gray-400 -mt-8 mb-12">
					<ReactMarkdown>{publication.citation}</ReactMarkdown>
				</div>
			)}

			{isPublicationScoped === false &&
				<>
					<div className="mb-4">
						<AISearchBar
							onSearch={loadAIResults}
							onClear={clearFilters}
						/>
						<SearchContextSummary aiSearchUsed={aiSearchUsed} selectedTagNames={selectedTagNames} selectedParticleSizeIds={selectedParticleSizeIds} />
					</div>
					<div className="mb-4">
						<ScaffoldGroupFilters
							setIsLoading={setIsLoading}
							condensed={true}
							allFiltersVisible={false}
							selectedParticleSizeIds={selectedParticleSizeIds}
							setSelectedParticleSizeIds={setSelectedParticleSizeIds}
							selectedTags={selectedTags}
							setSelectedTags={setSelectedTags}
							isSimulated={isSimulated}
							setIsSimulated={setIsSimulated}
						/>
					</div>
				</>
			}

			{isLoading ? (
				<LoadingSpinner />
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
						largeScreenColumns={4}
					/>
				</>
			)}

		</div>
	);
};

export default observer(ExploreScreen);
