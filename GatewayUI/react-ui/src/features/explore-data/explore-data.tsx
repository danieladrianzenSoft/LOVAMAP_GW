import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { HistogramPlot } from '../plotting/histogram-plot';
import { useParams } from "react-router-dom";
import { ScaffoldGroupData } from "../../app/models/scaffoldGroupData";
import React from "react";
import AISearchBar from "../../app/common/ai-search-bar/ai-seach-bar";
import toast from "react-hot-toast";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import { useScaffoldGroupFiltering } from "../../app/common/hooks/useScaffoldGroupFiltering";
import { SearchResultsDropdown } from "../../app/common/ai-search-bar/search-results-dropdown";
import { SidebarScaffoldGroups } from "./sidebar-scaffold-groups";
import { ViolinPlot } from "../plotting/violin-plot";
import { Sidebar } from "../../app/common/sidebar/sidebar";
import DescriptorCalculatorModal from "../descriptors/descriptor-calculator-modal";
import { downloadExperimentsAsExcel, triggerDownload } from '../../app/common/excel-generator/excel-generator';
import { openPreviewInNewTab } from "../../app/common/new-tab-preview/new-tab-preview";
import { DescriptorType } from "../../app/models/descriptorType";
import { PORE_DESCRIPTOR_MAP } from "../../constants/pore-descriptors";
import { useDescriptorTypes } from "../../app/common/hooks/useDescriptorTypes";
import { DescriptorSelector } from "../descriptors/descriptor-selector";

export const ExploreData: React.FC = observer(() => {
	const { commonStore, scaffoldGroupStore } = useStore();
	const { descriptorTypes } = useDescriptorTypes();

	const isLoggedIn = commonStore.isLoggedIn;

	const [isLoading, setIsLoading] = useState(true);
	const [loadingGroupId, setLoadingGroupId] = useState<number | null>(null);
	const [scaffoldGroups, setScaffoldGroups] = useState<ScaffoldGroupData[]>([]);
	const [searchResults, setSearchResults] = useState<ScaffoldGroup[]>([]);
	const [searching, setSearching] = useState(false);
	const [isSidebarOpen, setSidebarOpen] = useState(false);
	const [showDescriptorModal, setShowDescriptorModal] = useState(false);
	const [useLogScale, setUseLogScale] = useState(false);
	const [selectedDescriptorTypes, setSelectedDescriptorTypes] = useState<DescriptorType[]>([]);
	
	const [showDropdown, setShowDropdown] = useState(false);
	const searchContainerRef = useRef<HTMLDivElement>(null);
	
	const params = useParams<{ scaffoldGroupId?: string }>();
	const [resolvedScaffoldGroupId, ] = useState<number | null>(
		params.scaffoldGroupId ? parseInt(params.scaffoldGroupId, 10) : null
	);

	const isInitialLoad = useRef(true);

	const runSearch = async (query: string) => {
		setSearching(true);
		setShowDropdown(true);
		await loadAIResults(query); // this populates `scaffoldGroupStore.segmentedScaffoldGroups`
		setSearchResults(scaffoldGroupStore.segmentedScaffoldGroups.exact || []);
		setSearching(false);
	};

	// const getScaffoldGroupData = useCallback(async (descriptorTypeIds: number[]) => {
	// 	setIsLoading(true);

	// 	const data = resolvedScaffoldGroupId !== null
	// 		? await scaffoldGroupStore.getDataForVisualization(resolvedScaffoldGroupId, descriptorTypeIds)
	// 		: await scaffoldGroupStore.getDataForVisualizationRandom(descriptorTypeIds);

	// 	if (data) {
	// 		setScaffoldGroups([data]);
	// 	}
	// 	setIsLoading(false);	
	// }, [resolvedScaffoldGroupId, scaffoldGroupStore]);

	const updateAllScaffoldGroupsWithDescriptors = useCallback(async (descriptorTypeIds: number[]) => {
		if (scaffoldGroups.length === 0) return;

		setIsLoading(true);

		const updated = await Promise.all(
			scaffoldGroups.map(group =>
				scaffoldGroupStore.getDataForVisualization(group.scaffoldGroup.id, descriptorTypeIds)
			)
		);

		const validResults = updated.filter(Boolean) as ScaffoldGroupData[];
		setScaffoldGroups(validResults);

		setIsLoading(false);
	}, [scaffoldGroups, scaffoldGroupStore]);

	// const getAllScaffoldGroupData = useCallback(async (groupIds: number[], descriptorTypeIds: number[]) => {
	// 	setIsLoading(true);

	// 	const results = await Promise.all(
	// 		groupIds.map(id => scaffoldGroupStore.getDataForVisualization(id, descriptorTypeIds))
	// 	);

	// 	const validResults = results.filter(Boolean) as ScaffoldGroupData[];
	// 	setScaffoldGroups(validResults);

	// 	setIsLoading(false);
	// }, [scaffoldGroupStore]);

	const detailDescriptorTypeIds = useMemo(() => {
		return selectedDescriptorTypes.map(d => d.id);
	}, [selectedDescriptorTypes]);

	const groupedDescriptorsBySection = useMemo(() => {
		return selectedDescriptorTypes.reduce((acc, descriptor) => {
			const section = descriptor.subCategory || descriptor.category || 'Other';
			if (!acc[section]) acc[section] = [];
			acc[section].push({ descriptor, key: descriptor.name });
			return acc;
		}, {} as Record<string, Array<{ descriptor: DescriptorType; key: string }>>);
	}, [selectedDescriptorTypes]);

	useEffect(() => {
		if (!isInitialLoad.current || selectedDescriptorTypes.length === 0) return;

		isInitialLoad.current = false;

		const descriptorIds = selectedDescriptorTypes.map(d => d.id);

		const loadInitial = async () => {
			setIsLoading(true);

			const data = resolvedScaffoldGroupId !== null
				? await scaffoldGroupStore.getDataForVisualization(resolvedScaffoldGroupId, descriptorIds)
				: await scaffoldGroupStore.getDataForVisualizationRandom(descriptorIds);

			if (data) {
				setScaffoldGroups([data]);
			}

			setIsLoading(false);
		};

		loadInitial();
	}, [resolvedScaffoldGroupId, scaffoldGroupStore, selectedDescriptorTypes]);
	
	useEffect(() => {
		if (isInitialLoad.current) return;
		if (selectedDescriptorTypes.length === 0 || scaffoldGroups.length === 0) return;

		const descriptorTypeIds = selectedDescriptorTypes.map(d => d.id);
		updateAllScaffoldGroupsWithDescriptors(descriptorTypeIds);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedDescriptorTypes]);


	useEffect(() => {
		if (descriptorTypes.length > 0) {
			const byName = new Map(descriptorTypes.map(d => [d.name, d]));
			const defaults = PORE_DESCRIPTOR_MAP
			.filter(cfg => cfg.showInExplore)
			.map(cfg => byName.get(cfg.key))
			.filter(Boolean) as DescriptorType[];

			setSelectedDescriptorTypes(defaults);
		}
	}, [descriptorTypes]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchContainerRef.current &&
				!searchContainerRef.current.contains(event.target as Node)
				) {
				setShowDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handlePreviewDownloadClick = () => {
		if (scaffoldGroups.length === 0) return;

		const descriptorById = new Map(descriptorTypes.map(d => [d.id, d]));

		// Build scaffold data
		const selectedScaffoldGroups = scaffoldGroups.map(g => ({
			...g.scaffoldGroup,
			scaffolds: g.poreDescriptors.map((p, idx) => ({
				id: p.scaffoldId,
				replicateNumber: idx + 1,
				globalDescriptors: [],
				otherDescriptors: [],
				poreDescriptors: p.descriptors.map(d => {
					const meta = descriptorById.get(d.descriptorTypeId);
					return {
						descriptorTypeId: d.descriptorTypeId,
						label: meta?.label ?? '',
						name: meta?.name ?? '',
						unit: meta?.unit ?? '',
						values: d.values.join(','), // Excel-friendly
					};
				})
			}))
		}));

		// Determine which descriptor types to include in Excel
		const uiConfigMap = new Map(PORE_DESCRIPTOR_MAP.map(cfg => [cfg.key, cfg]));

		const selectedDescriptorTypes: DescriptorType[] = descriptorTypes
			.filter(d => uiConfigMap.has(d.name) && uiConfigMap.get(d.name)?.showInExplore)
			.map(d => ({
				...d,
				tableLabel: d.label || d.name,
				category: 'pore', // fallback or leave as-is if backend returns this
			}));

		const options = {
			columnOption: 'Scaffold Groups',
			sheetOption: 'Descriptors',
			excelFileOption: 'Scaffold Replicates',
			stackedColumnOption: 'True',
		};

		const result = downloadExperimentsAsExcel(
			selectedScaffoldGroups,
			selectedDescriptorTypes,
			options,
			true
		);

		if (result && result?.files?.length > 0) {
			const [firstFile] = result.files;
			openPreviewInNewTab(firstFile, triggerDownload, result.files, 100);
		}
	};

	const handleAddOverlayGroup = async (id: number, descriptorTypeIds: number[]) => {
		const alreadyExists = scaffoldGroups.some(group => group.scaffoldGroup.id === id);
		if (alreadyExists) {
			toast.error("Scaffold group already added.");
			return;
		}
		setLoadingGroupId(id);
		const data = await scaffoldGroupStore.getDataForVisualization(id, descriptorTypeIds);
		if (data) {
			setScaffoldGroups(prev => [...prev, data]);
		}
		setLoadingGroupId(null);
		setShowDropdown(false);
	};

	const handleReorderGroup = (scaffoldGroups: ScaffoldGroupData[]) => {
		setScaffoldGroups(scaffoldGroups);
	}

	const handleRemoveGroup = (groupId: number) => {
		setScaffoldGroups(prev => prev.filter(g => g.scaffoldGroup.id !== groupId));
	};

	const {
		selectedParticleSizeIds,
		setSelectedParticleSizeIds,
		selectedTagNames,
		setSelectedTags,
		loadAIResults,
		setAiSearchUsed,
	} = useScaffoldGroupFiltering(isLoggedIn, setSearching);

	const clearFilters = () => {
		setSelectedTags({});
		setSelectedParticleSizeIds([]);
		setAiSearchUsed(false);
		setSearchResults([]);
	};

	if (isLoading) return <p className="mt-8 ml-4 text-gray-500">Loading data...</p>;
	if (!scaffoldGroups) return <p className="mt-8 ml-4 text-red-500">Failed to load data</p>;
	
	return (
		<div className="flex mx-auto py-8 px-2">
			{/* Main dashboard area */}
			<div className="container pr-2">
				{/* Section Header: Title + View Data */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
					<h2 className="text-3xl text-gray-700 font-bold">Descriptor Data</h2>
					{scaffoldGroups.length > 0 && !isLoading && (
						<button
							onClick={handlePreviewDownloadClick}
							className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md shadow mt-2 sm:mt-0"
						>
							View Data
						</button>
					)}
				</div>

				<div className="mb-2">
					<p className="font-semibold">
						Visualize and download pore descriptor data that characterize your scaffolds of interest
					</p>
					<p>
						Use the search bar below to find and select scaffold groups. 
						Then select the interior pore descriptors you would like to visualize. We've initialized 
						the plots with a random scaffold group as an example.
					</p>
				</div>

				<div className="mb-8 mt-0 mr-2 relative" ref={searchContainerRef}>
					<AISearchBar onSearch={runSearch} onClear={clearFilters} onClick={() => {setShowDropdown(true)}}/>
					{showDropdown && (
						<SearchResultsDropdown
							results={searchResults}
							isLoading={searching}
							onSelect={(id) => {
								handleAddOverlayGroup(id, detailDescriptorTypeIds);
								setAiSearchUsed(false);
							}}
							selectedParticleSizeIds={selectedParticleSizeIds}
							selectedTagNames={selectedTagNames}
							loadingSelection={loadingGroupId}
						/>
					)}
				</div>

				{/* <ScaffoldGroupFilters 
					setIsLoading={setIsLoading} 
					condensed={true} 
					allFiltersVisible={false}
					selectedParticleSizeIds={selectedParticleSizeIds}
					setSelectedParticleSizeIds={setSelectedParticleSizeIds}
					selectedTags={selectedTags}
					setSelectedTags={setSelectedTags}
				/> */}

				<div className="w-full">
					<DescriptorSelector
						descriptorTypes={descriptorTypes.filter(d => d.category === 'Pore')}
						selectedDescriptorTypes={selectedDescriptorTypes}
						onChange={setSelectedDescriptorTypes}
					/>
				</div>
				

				{scaffoldGroups.length >= 4 && 
					<div className="flex justify-end mr-2 items-center mt-3 text-sm text-gray-700">
						<span className="mr-2">Use Log Scale</span>
						<label className="inline-flex items-center cursor-pointer relative w-11 h-6">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={useLogScale}
								onChange={() => setUseLogScale(prev => !prev)}
							/>
							<div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors" />
							<div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
						</label>
				</div>
				}
				{/* FIGURE OUT WHERE TO PLACE THIS */}
				{/* <div className="flex justify-between items-center mb-2 mr-2">
					<button
						onClick={() => setShowDescriptorModal(true)}
						className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-indigo-700"
					>
						Descriptor Estimator
					</button>
				</div> */}


				{!isLoading && Object.entries(groupedDescriptorsBySection).map(([sectionTitle, descriptors]) => (
					<div key={sectionTitle}>
						<h3 className="text-xl font-semibold text-gray-600 mb-4 mt-0">{sectionTitle}</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{descriptors.map(({ descriptor, key }) => {
								const data = scaffoldGroups.map(group =>
									group.poreDescriptors.flatMap(scaffold =>
									scaffold.descriptors.find(d => d.descriptorTypeId === descriptor.id)?.values ?? []
									)
								);

								return (
									<div key={key} className="bg-white rounded-xl p-2 relative min-h-[300px]">
									{data.length > 0 ? (
										data.length <= 3 ? (
										<HistogramPlot
											data={data}
											title={descriptor.label}
											interactive={false}
											showHoverInfo={true}
											hideYLabels={false}
											xlabel={descriptor.unit || ''}
											isNormalized={true}
											ylabel="%"
											useLogScale={false}
										/>
										) : (
										<ViolinPlot
											data={data}
											title={descriptor.label}
											interactive={false}
											showHoverInfo={true}
											ylabel={descriptor.unit || ''}
											ylim={[0, null]}
											hideTickLabels={true}
											useLogScale={useLogScale}
										/>
										)
									) : (
										<p className="text-sm text-gray-400 italic">No data for {descriptor.label}</p>
									)}
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>

			{/* Sidebar */}
			<Sidebar
				isVisible={isSidebarOpen}
				onClose={() => setSidebarOpen(false)}
				onOpen={() => setSidebarOpen(true)}
				title="Scaffold Groups"
				toggleButtonLabel="Scaffold Groups"
				className="w-1/4 shrink-0 bg-gray-100 p-0"
				>
				<SidebarScaffoldGroups
					scaffoldGroups={scaffoldGroups}
					onReorder={handleReorderGroup}
					onRemove={handleRemoveGroup}
				/>
			</Sidebar>	
			<DescriptorCalculatorModal
				isOpen={showDescriptorModal}
				onClose={() => setShowDescriptorModal(false)}
			/>		
		</div>
	);
});
