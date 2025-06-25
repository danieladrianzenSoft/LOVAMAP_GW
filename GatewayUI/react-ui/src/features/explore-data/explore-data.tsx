import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { HistogramPlot } from '../plotting/histogram-plot';
import { useParams } from "react-router-dom";
import { ScaffoldGroupData } from "../../app/models/scaffoldGroupData";
import { PoreInfoForScaffold } from "../../app/models/poreInfo";
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

export const ExploreData: React.FC = observer(() => {
	const { commonStore, scaffoldGroupStore } = useStore();
	const isLoggedIn = commonStore.isLoggedIn;

	const [loading, setLoading] = useState(true);
	const [loadingGroupId, setLoadingGroupId] = useState<number | null>(null);
	const [scaffoldGroups, setScaffoldGroups] = useState<ScaffoldGroupData[]>([]);
	const [searchResults, setSearchResults] = useState<ScaffoldGroup[]>([]);
	const [searching, setSearching] = useState(false);
	const [isSidebarOpen, setSidebarOpen] = useState(false);
	const [showDescriptorModal, setShowDescriptorModal] = useState(false);
	const [useLogScale, setUseLogScale] = useState(false);
	
	const [showDropdown, setShowDropdown] = useState(false);
	const searchContainerRef = useRef<HTMLDivElement>(null);
	
	const params = useParams<{ scaffoldGroupId?: string }>();
	const [resolvedScaffoldGroupId, ] = useState<number | null>(
		params.scaffoldGroupId ? parseInt(params.scaffoldGroupId, 10) : null
	);

	const runSearch = async (query: string) => {
		setSearching(true);
		setShowDropdown(true);
		await loadAIResults(query); // this populates `scaffoldGroupStore.segmentedScaffoldGroups`
		setSearchResults(scaffoldGroupStore.segmentedScaffoldGroups.exact || []);
		setSearching(false);
	};

	const sections = [
	{
		title: "Interior Pore Size",
		plots: [
		{ key: "poreVolume", label: "Pore Volume", xlabel: "pL" },
		{ key: "poreSurfaceArea", label: "Pore Surface Area", xlabel: "μm²/1000" }
		]
	},
	{
		title: "Interior Pore Shape",
		plots: [
		{ key: "poreLongestLength", label: "Longest Length", xlabel: "μm" },
		{ key: "poreAspectRatio", label: "Aspect Ratio", xlabel: "" }
		]
	}
	] as const;

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);

			const data = resolvedScaffoldGroupId !== null
				? await scaffoldGroupStore.getDataForVisualization(resolvedScaffoldGroupId)
				: await scaffoldGroupStore.getDataForVisualizationRandom();

			if (data) {
				setScaffoldGroups([data]);
			}
			setLoading(false);
		};

		fetchData();
	}, [scaffoldGroupStore, resolvedScaffoldGroupId]);

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

	const handleAddOverlayGroup = async (id: number) => {
		const alreadyExists = scaffoldGroups.some(group => group.scaffoldGroup.id === id);
		if (alreadyExists) {
			toast.error("Scaffold group already added.");
			return;
		}
		setLoadingGroupId(id);
		const data = await scaffoldGroupStore.getDataForVisualization(id);
		if (data) {
			setScaffoldGroups(prev => [...prev, data]);
		}
		setLoadingGroupId(null);
		setShowDropdown(false);
	};

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

	if (loading) return <p className="mt-8 ml-4 text-gray-500">Loading data...</p>;
	if (!scaffoldGroups) return <p className="mt-8 ml-4 text-red-500">Failed to load data</p>;
	
	const combine = (key: keyof PoreInfoForScaffold): number[][] => {
		return scaffoldGroups.map(group =>
			group.poreDescriptors.flatMap(descriptor => descriptor[key] || [])
		);
	};

	return (
		<div className="flex mx-auto py-8 px-2">
			{/* Main dashboard area */}
			<div className="flex-1 space-y-12 pr-2">
				<div className="text-3xl text-gray-700 font-bold mb-2">Descriptor data</div>

				<div className="mb-0 mt-0 mr-2 relative" ref={searchContainerRef}>
					<AISearchBar onSearch={runSearch} onClear={clearFilters} onClick={() => setShowDropdown(true)}/>
					{showDropdown && (
						<SearchResultsDropdown
							results={searchResults}
							isLoading={searching}
							onSelect={(id) => {
								handleAddOverlayGroup(id);
								setAiSearchUsed(false);
							}}
							selectedParticleSizeIds={selectedParticleSizeIds}
							selectedTagNames={selectedTagNames}
							loadingSelection={loadingGroupId}
						/>
					)}
				</div>

				{scaffoldGroups.length >= 3 && 
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

				{sections.map((section) => (
					<div key={section.title}>
						<h3 className="text-xl font-semibold text-gray-600 mb-4 mt-0">{section.title}</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{section.plots.map(({ key, label, xlabel }) => {
								const data = combine(key);
								return (
									<div key={key} className="bg-white rounded-xl p-2 relative min-h-[300px]">
										{data.length > 0 ? (
											data.length <= 2 ? (
												<HistogramPlot
													data={data}
													title={label}
													interactive={false}
													showHoverInfo={true}
													hideYLabels={false}
													xlabel={xlabel}
													isNormalized={true}
													ylabel="%"
													useLogScale={false}
												/>
											) : (
												<ViolinPlot
													data={data}
													title={label}
													interactive={false}
													showHoverInfo={true}
													ylabel={xlabel}
													ylim={[0, null]}
													hideTickLabels={true}
													useLogScale={useLogScale}

												/>
											)
										) : (
											<p className="text-sm text-gray-400 italic">No data for {label}</p>
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
