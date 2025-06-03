import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { useParams } from 'react-router-dom';
import History from '../../app/helpers/History';
import useUndoShortcut from '../../app/common/hooks/undo';
import CanvasViewer from './canvas-viewer';
import InfoPanel from './info-panel';
import HiddenPanel from './hidden-panel';
import SelectedPanel from './selected-panel';
import * as THREE from 'three';
import UpdateDomainModal from './update-domain-modal';
import ScreenshotViewer from './screenshot-viewer';
import { ImageCategory, ImageToCreate } from '../../app/models/image';
import PoresPanel from './pores-panel';
import ParticlesPanel from './particles-panel';
import { useUndoManager } from '../../app/common/hooks/useUndoManager';

const Visualization: React.FC = () => {
	// Store access
	const { domainStore, userStore, scaffoldGroupStore } = useStore();
	const params = useParams<{ scaffoldId?: string }>();

	// State
	const [selectedScaffoldId, setSelectedScaffoldId] = useState<number | null>(null);
	const [selectedScaffoldGroupId, setSelectedScaffoldGroupId] = useState<number | null>(null);
	const [scaffoldIdForScreenshot, setScaffoldIdForScreenshot] = useState<number | null>(null);
	const [selectedCategories, setSelectedCategories] = useState<number[]>([0]);

	const [hiddenByCategory, setHiddenByCategory] = useState<Record<number, Set<string>>>({ 0: new Set(), 1: new Set() });
	const [selectedByCategory, setSelectedByCategory] = useState<Record<number, { id: string, mesh: THREE.Mesh } | null>>({ 0: null, 1: null });
	const [isPanelOpen, setIsPanelOpen] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	// const [showHelp, setShowHelp] = useState(false);
	const [, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const currentlyLoadingScaffoldIdRef = useRef<number | null>(null);

  	const [showParticlesPanelOpen, setShowParticlesPanelOpen] = useState(true);
	const [showPoresPanelOpen, setShowPoresPanelOpen] = useState(false);
	const [showParticles, setShowParticles] = useState(true);
	const [showPores, setShowPores] = useState(false);
  	const [hasAutoHiddenEdgePores, setHasAutoHiddenEdgePores] = useState(false);
	const [areEdgePoresHidden, setAreEdgePoresHidden] = useState(false);
	const [dimAppliedOnce, setDimAppliedOnce] = useState(false);

	const resolvedScaffoldId = params.scaffoldId ? parseInt(params.scaffoldId, 10) : null;
	const canEdit = userStore.user?.roles?.includes("administrator") ?? false;

	const particleDomain = domainStore.getActiveDomain(0);
	const poreDomain = domainStore.getActiveDomain(1);
	const particleUrl = domainStore.getActiveMeshUrl(0);
	const poreUrl = domainStore.getActiveMeshUrl(1);

	const [dimmedParticles, setDimmedParticles] = useState(false);
	const [dimmedPores, setDimmedPores] = useState(false);
	const [poreOpacity, setPoreOpacity] = useState(1);
	const [particleOpacity, setParticleOpacity] = useState(1);
	const [userOverrideParticleOpacity, setUserOverrideParticleOpacity] = useState(false);
	const [poreColor, setPoreColor] = useState(null);
	const [particleColor, setParticleColor] = useState(null);

	// const screenshotCategory = selectedCategories[0];
	const [screenshotCategory, setScreenshotCategory] = useState<number | null>(null);
	// const meshUrlReady = !!(screenshotCategory != null && domainStore.getActiveMeshUrl(screenshotCategory));


	const defaultDimmedOptions = useMemo(() => ({
		color: '#E7F6E3',
		opacity: 0.1,
	}), []);

	const loadDomainAndGroup = useCallback(async () => {
		const category = selectedCategories[0];
		let scaffoldId = selectedScaffoldId ?? resolvedScaffoldId;

		setHasAutoHiddenEdgePores(false);

		try {
			const actualId = await domainStore.visualizeDomain(scaffoldId, category);
			if (actualId != null) {
				scaffoldId = actualId;
				setSelectedScaffoldId(actualId);
			} else {
				setSelectedScaffoldId(scaffoldId);
			}
		} catch (error) {
			console.error(error);
			return;
		}

		if (!scaffoldId) return;
		currentlyLoadingScaffoldIdRef.current = scaffoldId;

		try {
			const [group] = await Promise.all([
				scaffoldGroupStore.loadGroupForScaffoldId(scaffoldId),
				domainStore.getDomainMetadata(0, domainStore.getActiveDomain(0)?.id)
			]);
			if (group) {
				setSelectedScaffoldGroupId(group.id);
			}
		} catch (error) {
		console.warn("Failed to load scaffold group", error);
		}
	}, [selectedCategories, selectedScaffoldId, resolvedScaffoldId, domainStore, scaffoldGroupStore]);

	const {
		addToHistory,
		undoLastAction,
		clearHistory
	} = useUndoManager({
		selectedByCategory,
		setSelectedByCategory,
		hiddenByCategory,
		setHiddenByCategory,
		setShowParticles,
		setShowPores,
		setAreEdgePoresHidden,
	});

	useUndoShortcut(undoLastAction);

	useEffect(() => {
		const category = 1; // Pores
		const metadata = domainStore.getActiveMetadata(category);

		if (showPores && metadata && !hasAutoHiddenEdgePores) {
			const edgeHidden = new Set<string>();

			Object.entries(metadata.metadata).forEach(([id, meta]) => {
				if (typeof meta === "object" && meta && "edge" in meta && (meta as any).edge === 1) {
					edgeHidden.add(id);
				}
			});

			setHiddenByCategory(prev => ({
				...prev,
				[category]: edgeHidden,
			}));

			setAreEdgePoresHidden(true);
			setHasAutoHiddenEdgePores(true);
		}
	}, [showPores, domainStore, hasAutoHiddenEdgePores]);

	const ensureDomainLoaded = useCallback(
		async (category: number) => {
			const existing = domainStore.getActiveDomain(category);
			if (existing) return;

			const scaffoldId = selectedScaffoldId ?? resolvedScaffoldId;
			if (!scaffoldId) return;

			const loadedId = await domainStore.visualizeDomain(scaffoldId, category);
			if (loadedId != null) {
			await domainStore.getDomainMetadata(category, domainStore.getActiveDomain(category)?.id);
			}
		},
		[domainStore, selectedScaffoldId, resolvedScaffoldId]
	);

	useEffect(() => {
		loadDomainAndGroup();
	}, [selectedCategories, loadDomainAndGroup]);

	useEffect(() => {
		const shouldDimParticles = showParticles && showPores;

		if (shouldDimParticles && !dimAppliedOnce) {
			setDimmedParticles(true);
			setParticleOpacity(defaultDimmedOptions.opacity);
			setUserOverrideParticleOpacity(false);
			setDimAppliedOnce(true); // mark as done
		}
	}, [showParticles, showPores, dimAppliedOnce, defaultDimmedOptions]);

	useEffect(() => {
		return () => {
		domainStore.clearDomainMesh(0);
		domainStore.clearDomainMesh(1);
		};
	}, [domainStore]);

	const toggleOpenParticlePorePanels = (category: number) => {
		if (category === 0) {
			setShowParticlesPanelOpen(true);
			setShowPoresPanelOpen(false);
		} else if (category === 1) {
			setShowPoresPanelOpen(true);
			setShowParticlesPanelOpen(false);
		}
	}

	const handleEntityClick = useCallback((category: number, particleId: string, particle: THREE.Mesh) => {
		if (!particle || !(particle instanceof THREE.Mesh)) return;

		toggleOpenParticlePorePanels(category);

		const currentlySelected = selectedByCategory[category];

		const particleMaterial = Array.isArray(particle.material)
			? particle.material[0]
			: particle.material;

		const prevState = {
			material: particleMaterial,
			visible: particle.visible,
			mesh: particle,
		};

		if (currentlySelected?.id === particleId) {
			addToHistory({
				type: "UNSELECT",
				category,
				particleId,
				previousState: {
					material: particleMaterial,
					visible: particle.visible,
					mesh: particle,
				}
			});
			setSelectedByCategory((prev) => ({ ...prev, [category]: null }));
      		return;
		}

		if (currentlySelected) {
			addToHistory({
				type: "SWITCH",
				category,
				particleId: currentlySelected.id,
				previousState: {
					material: Array.isArray(currentlySelected.mesh.material)
						? currentlySelected.mesh.material[0]
						: currentlySelected.mesh.material,
					visible: currentlySelected.mesh.visible,
					mesh: currentlySelected.mesh,
				},
				newState: {
					id: particleId,
					mesh: particle,
					material: Array.isArray(particle.material)
						? particle.material[0]
						: particle.material,
				},
			});
		} else {
			addToHistory({type: 'SELECT', category, particleId, previousState: prevState})
		}

		setSelectedByCategory((prev) => ({
			...Object.fromEntries(Object.keys(prev).map((key) => [key, null])),
			[category]: { id: particleId, mesh: particle }
		}));

	}, [addToHistory, selectedByCategory]);

	const handleEntityRightClick = (category: number, particleId: string, particle: THREE.Mesh) => {
		toggleOpenParticlePorePanels(category);

		setHiddenByCategory((prev) => {
			const newSet = new Set(prev[category]);
			const isCurrentlyHidden = newSet.has(particleId);
			const actionType = isCurrentlyHidden ? 'SHOW' : 'HIDE';

			if (isCurrentlyHidden) {
				newSet.delete(particleId);
			} else {
				newSet.add(particleId);
			}

			addToHistory({
				type: actionType,
				category,
				particleId,
				previousState: {
					visible: !isCurrentlyHidden, // what the state was before the toggle
				},
			});

			return { ...prev, [category]: newSet };
		});
	};

	const debugMode = false;
	const meshList = [];
	if (particleUrl) {
		meshList.push({
			url: particleUrl,
			category: 0,
			visible: showParticles,
			hiddenIds: hiddenByCategory[0],
			selectedEntity: selectedByCategory[0],
			onEntityClick: handleEntityClick,
			onEntityRightClick: handleEntityRightClick,
			dimmed: dimmedParticles,
			opacity: userOverrideParticleOpacity ? particleOpacity : undefined,
			dimmedOptions: defaultDimmedOptions,
			debugMode: debugMode
		});
	}
	if (poreUrl) {
		meshList.push({
			url: poreUrl,
			category: 1,
			visible: showPores,
			hiddenIds: hiddenByCategory[1],
			selectedEntity: selectedByCategory[1],
			onEntityClick: handleEntityClick,
			onEntityRightClick: handleEntityRightClick,
			dimmed: dimmedPores,
			opacity: poreOpacity,
			dimmedOptions: defaultDimmedOptions,
			debugMode: debugMode
		});
	}

	const toggleVisibility = (id: string, category: number) => {
		setHiddenByCategory(prev => {
			const newSet = new Set(prev[category]);
			const wasHidden = newSet.has(id);
			const actionType = wasHidden ? 'SHOW' : 'HIDE';

			if (wasHidden) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}

			addToHistory({
				type: actionType,
				category,
				particleId: id,
				previousState: { visible: !wasHidden }, // what it was before
			});

			return { ...prev, [category]: newSet };
		});
	};

	const handleToggleHideEdgePores = (hide: boolean) => {
		const metadata = domainStore.getActiveMetadata(1);
		if (!metadata) return;

		const newHidden = new Set(hiddenByCategory[1]);

		Object.entries(metadata.metadata).forEach(([id, meta]) => {
			if (typeof meta === "object" && meta && "edge" in meta && (meta as any).edge === 1) {
				if (hide) {
					newHidden.add(id);
				} else {
					newHidden.delete(id);
				}
			}
		});

		addToHistory({
			type: 'TOGGLE_EDGE_PORES',
			category: 1,
			previousState: areEdgePoresHidden,
		});

		setHiddenByCategory(prev => ({ ...prev, 1: newHidden }));
		setAreEdgePoresHidden(hide);
	};

	const handleToggleShowParticles = (value: boolean) => {
		addToHistory({
			type: 'TOGGLE_MESH_VISIBILITY',
			category: 0,
			previousState: showParticles,
		});
		setShowParticles(value);
		setUserOverrideParticleOpacity(false);
	};

	const handleToggleShowPores = (value: boolean) => {
		addToHistory({
			type: 'TOGGLE_MESH_VISIBILITY',
			category: 1,
			previousState: showPores,
		});
		setShowPores(value);
		setUserOverrideParticleOpacity(false);
	};

	const handleScaffoldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newScaffoldId = parseInt(e.target.value, 10);

		// Clear all existing domain state
		domainStore.clearDomainMesh(0);
		domainStore.clearDomainMesh(1);

		// Reset local state
		setSelectedScaffoldId(newScaffoldId);
		setSelectedByCategory((prev) => ({
		...Object.fromEntries(Object.keys(prev).map((key) => [key, null]))
		}));
		setHiddenByCategory({ 0: new Set(), 1: new Set() });
		setScaffoldIdForScreenshot(null);
		setHasAutoHiddenEdgePores(false);

		// Reset panel open state or any visibility flags if needed
		setShowParticlesPanelOpen(true);
		setShowPoresPanelOpen(false);
		setShowParticles(true);
		setShowPores(false);
		clearHistory();
	};

	const handleResetOverrides = () => {
		setParticleOpacity(1); // Restore full opacity
		setUserOverrideParticleOpacity(false); // Allow dimming logic again
		setDimmedParticles(false); // Disable dim
		setParticleColor(null);
	}

	const handleScreenshotUpload = async (blob: Blob) => {
		console.log("Visualization - handleScreenshotUpload:", selectedScaffoldGroupId);

		if (!selectedScaffoldGroupId || screenshotCategory == null) return;
		try {
			const image: ImageToCreate = {
				scaffoldGroupId: selectedScaffoldGroupId,
				scaffoldId: selectedScaffoldId,
				file: new File([blob], `scaffold-${selectedScaffoldId}.png`, { type: 'image/png' }),
				category: screenshotCategory,
			};
			await scaffoldGroupStore.uploadImageForScaffoldGroup(selectedScaffoldGroupId, image);
		} catch (err) {
			console.error("Thumbnail upload failed", err);
		} finally {
			setScaffoldIdForScreenshot(null);
			setScreenshotCategory(null);
		}
	};

  	const handleFormSubmit = async (
		e: React.FormEvent,
		payload: {
			category: number;
			voxelSize: number | null;
			domainSize: [number | null, number | null, number | null];
			selectedFile?: File | null;
			metadataFile?: File | null;
		}
		) => {
		e.preventDefault();

		if (selectedScaffoldId === null) return;

		try {
			setIsLoading(true);

			const formattedDomainSize = payload.domainSize.every((v) => v !== null)
			? `[${payload.domainSize.join(",")}]`
			: undefined;

			if (payload.selectedFile) {
				// domainStore.clearDomainMesh(payload.category);

				await domainStore.uploadDomainMesh(
					selectedScaffoldId,
					payload.selectedFile,
					payload.category,
					payload.voxelSize || undefined,
					formattedDomainSize,
					payload.metadataFile
				);

				// Refresh that domain after upload
				await domainStore.visualizeDomain(selectedScaffoldId, payload.category, true);
				await domainStore.getDomainMetadata(payload.category, domainStore.getActiveDomain(payload.category)?.id);

				console.log(`PAYLOAD CATEGORY: ${payload.category}`);

				if (payload.category === 0 || payload.category === 1) {
					console.log(`TRIGGERING SCREENSHOT: ${payload.category}`);
					setScaffoldIdForScreenshot(selectedScaffoldId);
					setScreenshotCategory(payload.category);
				}
			}

			setIsModalOpen(false); // close modal
		} catch (error) {
			console.error("Upload failed", error);
			setError("Upload failed. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// active category: particles - 0, pores = 1
	const activeCategory =
		showParticlesPanelOpen ? 0 :
		showPoresPanelOpen ? 1 :
		0;
	const activeSelected = selectedByCategory[activeCategory];
	const activeHidden = hiddenByCategory[activeCategory];
	const activeMetadata = domainStore.getActiveMetadata(activeCategory);
	const isActiveCategoryVisible = activeCategory === 0 ? showParticles : activeCategory === 1 ? showPores : false;

	return (
		<div className="relative w-full h-screen overflow-hidden mt-8 ml-2">
			<div className="w-full h-full rounded-lg">
				{!isLoading && meshList.length > 0 && (
					<div className="h-full w-full -mt-16">
						<CanvasViewer meshes={meshList} />
					</div>
				)}
				{!isLoading && meshList.length === 0 && (
					<div className="text-gray-600">This mesh does not exist</div>
				)}
			</div>

			{activeCategory != null && isActiveCategoryVisible && (
				<div className="absolute top-0 left-0 z-20 space-y-1 ml-2">
					<HiddenPanel
						category={activeCategory}
						hiddenIds={activeHidden}
						onShowAll={() => {
							setHiddenByCategory((prev) => {
								const prevHidden = new Set(prev[activeCategory]); // capture what WAS hidden
								addToHistory({
									type: 'SHOW_ALL',
									category: activeCategory,
									previousState: { hiddenIds: prevHidden },
								});
								return { ...prev, [activeCategory]: new Set() };
							});
						}}
						onToggleVisibility={(id) => toggleVisibility(id, activeCategory)}
					/>
					<SelectedPanel
						selectedDomainEntity={activeSelected}
						domainCategory={activeCategory}
						onUnselect={() => setSelectedByCategory(prev => ({ ...prev, [activeCategory]: null }))}
						domainMetadata={activeMetadata}
						scaffoldGroup={scaffoldGroupStore.selectedScaffoldGroup}
					/>
				</div>
			)}

			<div className="absolute top-0 right-0 z-20 space-y-1 mr-2">
				<div className="mt-2 flex w-full">
					<button className="button-primary items-center content-center w-full" onClick={() => History.push('/explore')}>
						Explore More
					</button>
				</div>

				<InfoPanel
					isOpen={isPanelOpen}
					toggleOpen={() => setIsPanelOpen(!isPanelOpen)}
					scaffoldGroup={scaffoldGroupStore.selectedScaffoldGroup}
					selectedScaffoldId={selectedScaffoldId}
					onScaffoldChange={handleScaffoldChange}
					selectedCategories={selectedCategories}
					onCategoryChange={setSelectedCategories}
					domain={particleDomain}
					// canEdit={canEdit}
					// onEditClick={() => setIsModalOpen(true)}
					isLoading={scaffoldGroupStore.isFetchingScaffoldGroup}
				/>

				<ParticlesPanel
					isOpen={showParticlesPanelOpen}
					togglePanelOpen={async () => {
						if (!showParticlesPanelOpen) {
							await ensureDomainLoaded(0); // Particles = category 0
							setShowParticlesPanelOpen(true);
							setShowPoresPanelOpen(false); // mutually exclusive
						} else {
							setShowParticlesPanelOpen(false);
						}
					}}
					canEdit={canEdit}
					onEditClick={() => setIsModalOpen(true)}
					domain={particleDomain}
					visible={showParticles} // this controls if particles show in canvas
					onToggleVisibility={() => {handleToggleShowParticles(!showParticles)}}
					opacity={particleOpacity}
		  			setOpacity={(value: number) => {
						setParticleOpacity(value);
						setUserOverrideParticleOpacity(true);
					}}
					onResetOverrides={handleResetOverrides}
				/>

				<PoresPanel
					isOpen={showPoresPanelOpen}
					togglePanelOpen={async () => {
						if (!showPoresPanelOpen) {
							await ensureDomainLoaded(1); // Pores = category 1
							setShowPoresPanelOpen(true);
							setShowParticlesPanelOpen(false); // mutually exclusive
						} else {
							setShowPoresPanelOpen(false);
						}
					}}
					canEdit={canEdit}
					onEditClick={() => setIsModalOpen(true)}
					domain={poreDomain}
					visible={showPores}
					onToggleVisibility={() => {handleToggleShowPores(!showPores)}}
					areEdgePoresHidden={areEdgePoresHidden}
					onToggleHideEdgePores={handleToggleHideEdgePores}
				/>
			</div>

			<UpdateDomainModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onFormSubmit={handleFormSubmit}
				domain={activeCategory === 1 ? poreDomain :  particleDomain}
				selectedCategory={activeCategory}
				isLoading={isLoading}
			/>

			{scaffoldIdForScreenshot && screenshotCategory != null && (
				<div style={{ opacity: 0, position: 'absolute', width: 512, height: 512, pointerEvents: 'none' }}>
					<ScreenshotViewer
						scaffoldId={scaffoldIdForScreenshot}
						category={screenshotCategory}
						onScreenshotReady={handleScreenshotUpload}
					/>
				</div>
			)}
		</div>
	);
};

export default observer(Visualization);