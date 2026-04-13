import React, {useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ScaffoldGroupFilters from "../scaffold-groups/scaffold-group-filter";
import { FaSpinner } from 'react-icons/fa';
import ScaffoldGroupsFilterResults from "../scaffold-groups/scaffold-group-filter-results";
import { useScaffoldGroupFiltering } from "../../app/common/hooks/useScaffoldGroupFiltering";
import AISearchBar from "../../app/common/ai-search-bar/ai-seach-bar";
import { SearchContextSummary } from "../../app/common/ai-search-bar/search-context-summary";
import { useSearchParams } from "react-router-dom";
import { Publication } from "../../app/models/publication";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import ReactMarkdown from "react-markdown";

const ExploreScreen = () => {
	const { commonStore, scaffoldGroupStore, publicationStore, userStore } = useStore();
	const isLoggedIn = commonStore.isLoggedIn;
	const isAdmin = userStore.user?.roles?.includes("administrator") ?? false;
	const {
		scaffoldGroups,
		segmentedScaffoldGroups: { exact, related }
	} = scaffoldGroupStore
	const [visibleDetails, setVisibleDetails] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [publication, setPublication] = useState<Publication | null>(null);

	// dataset modal state
	const [showDatasetModal, setShowDatasetModal] = useState(false);
	const [scaffoldSearch, setScaffoldSearch] = useState('');
	const [allScaffolds, setAllScaffolds] = useState<ScaffoldGroup[]>([]);
	const [scaffoldsLoading, setScaffoldsLoading] = useState(false);
	const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
	const [datasetError, setDatasetError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

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
		// publicationDatasetId,
		restrictToPublicationDataset,
		isPublicationScoped,
		isSimulated,
		setIsSimulated,
	} = useScaffoldGroupFiltering(isLoggedIn, setIsLoading, initialScope);

	useEffect(() => {
		const fetchPublication = async () => {
			setIsLoading(true);
			try {
				if (restrictToPublicationDataset && publicationId)
				{
					const publication = await publicationStore.getPublication(publicationId);
					setPublication(publication);
				}
			} catch (error) {
				console.error("Error fetching publication:", error);
			} finally {
				setIsLoading(false)
			}
		}
		fetchPublication();
	}, [publicationId, publicationStore, restrictToPublicationDataset])

	// load scaffolds when modal opens
	useEffect(() => {
		if (!showDatasetModal) return;
		const handler = setTimeout(async () => {
			setScaffoldsLoading(true);
			try {
				const response = await scaffoldGroupStore.getSummarizedScaffoldGroups({
					selectedTags: [], sizeIds: [], restrictToPublicationDataset: false, isSimulated: null,
				});
				const all: ScaffoldGroup[] = response ?? [];
				const filtered = scaffoldSearch.trim()
					? all.filter(g =>
						g.name?.toLowerCase().includes(scaffoldSearch.toLowerCase()) ||
						g.tags?.some(t => t.toLowerCase().includes(scaffoldSearch.toLowerCase()))
					) : all;
				setAllScaffolds(filtered);
			} catch { setAllScaffolds([]); }
			finally { setScaffoldsLoading(false); }
		}, 300);
		return () => clearTimeout(handler);
	}, [scaffoldSearch, showDatasetModal]); // eslint-disable-line

	const handleOpenDataset = () => {
		setSelectedGroupIds(new Set());
		setScaffoldSearch('');
		setDatasetError(null);
		setAllScaffolds([]);
		setShowDatasetModal(true);
	};

	const toggleGroup = (id: number) => {
		setSelectedGroupIds(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const handleSaveDataset = async () => {
		if (selectedGroupIds.size === 0) { setDatasetError('Please select at least one scaffold group.'); return; }
		if (!publicationId) { setDatasetError('Publication ID missing.'); return; }
		const scaffoldIds = allScaffolds
			.filter(g => selectedGroupIds.has(g.id))
			.flatMap(g => g.scaffoldIds);
		setIsSaving(true);
		setDatasetError(null);
		const { success, error } = await publicationStore.createDataset(publicationId, scaffoldIds, []);
		setIsSaving(false);
		if (!success) { setDatasetError(error ?? 'Unknown error.'); return; }
		setShowDatasetModal(false);
		// refresh scaffold groups in explore view
		await scaffoldGroupStore.getSummarizedScaffoldGroups({
			selectedTags: [], sizeIds: [],
			publicationId: publicationId ?? undefined,
			restrictToPublicationDataset: true,
			isSimulated: null,
		});
	};

	const clearFilters = () => {
		setSelectedTags({});
		setSelectedParticleSizeIds([]);
		setIsSimulated(null);
		setAiSearchUsed(false);
	};

	const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

	return (
		<div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
			<div className="mb-12">
				<div className="flex items-start justify-between">
					<div>
						<div className="text-3xl text-gray-700 font-bold">
							{isPublicationScoped
								? `Data from Publication`
								: `Explore ${isLoggedIn ? "scaffolds" : "public scaffolds"}`}
						</div>
						{isPublicationScoped && publication && 
							<div className="text-xl text-gray-400">
								<ReactMarkdown>{publication.citation}</ReactMarkdown>
							</div>
						}
					</div>
					{isPublicationScoped && isAdmin && (
						<button
							className="button-primary w-auto px-4 py-2 text-sm mb-0 shrink-0 mt-1"
							onClick={handleOpenDataset}
						>
							+ Add Dataset
						</button>
					)}
				</div>
			</div>
			
			{isPublicationScoped === false && 
				<>
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
						isSimulated={isSimulated}
						setIsSimulated={setIsSimulated}
					/>
				</>
			}
			
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

			{/* Add Dataset Modal */}
			{showDatasetModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
					<div className="bg-white rounded-lg shadow-xl mx-4 p-6 w-full max-w-xl">
						<div className="text-xl font-bold text-gray-700 mb-4">Link Scaffold Groups</div>

						<input
							value={scaffoldSearch}
							onChange={e => setScaffoldSearch(e.target.value)}
							className={`${inputCls} mb-3`}
							placeholder="Search by name or tag..."
						/>

						{selectedGroupIds.size > 0 && (
							<div className="flex flex-wrap gap-1 mb-3">
								{allScaffolds.filter(g => selectedGroupIds.has(g.id)).map(g => (
									<span key={g.id}
										className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full cursor-pointer"
										onClick={() => toggleGroup(g.id)}
									>
										{g.name || `Group ${g.id}`} ✕
									</span>
								))}
							</div>
						)}

						<div className="border border-gray-200 rounded overflow-y-auto max-h-72">
							{scaffoldsLoading ? (
								<div className="flex justify-center py-6"><FaSpinner className="animate-spin" size={24} /></div>
							) : allScaffolds.length === 0 ? (
								<p className="text-sm text-gray-400 text-center py-6">No scaffold groups found.</p>
							) : (
								allScaffolds.map(g => (
									<div key={g.id}
										className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${selectedGroupIds.has(g.id) ? 'bg-blue-50' : ''}`}
										onClick={() => toggleGroup(g.id)}
									>
										<input type="checkbox" readOnly checked={selectedGroupIds.has(g.id)} className="accent-blue-600 w-4 h-4 shrink-0" />
										<div>
											<div className="text-sm font-medium text-gray-800">{g.name || `Group ${g.id}`}</div>
											<div className="text-xs text-gray-400">
												{g.scaffoldIds?.length ?? 0} scaffold{g.scaffoldIds?.length !== 1 ? 's' : ''}
												{g.tags?.length ? ` · ${g.tags.slice(0, 3).join(', ')}` : ''}
											</div>
										</div>
									</div>
								))
							)}
						</div>

						<p className="text-xs text-gray-400 mt-2">{selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? 's' : ''} selected</p>
						{datasetError && <p className="mt-2 text-sm text-red-500">{datasetError}</p>}

						<div className="mt-5 flex justify-end gap-3">
							<button
								className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
								onClick={() => setShowDatasetModal(false)}
								disabled={isSaving}
							>
								Cancel
							</button>
							<button
								className="button-primary px-4 py-2 text-sm w-auto mb-0 flex items-center gap-2"
								onClick={handleSaveDataset}
								disabled={isSaving}
							>
								{isSaving && <FaSpinner className="animate-spin" size={13} />}
								{isSaving ? 'Saving...' : 'Link Scaffolds'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default observer(ExploreScreen);
