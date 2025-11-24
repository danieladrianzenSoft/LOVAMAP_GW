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
import { ImageToCreate } from '../../app/models/image';
import PoresPanel from './pores-panel';
import ParticlesPanel from './particles-panel';
import { useUndoManager } from '../../app/common/hooks/useUndoManager';
import AcknowledgementModal from '../acknowledgement/acknowledgement-modal';

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
	const [isPanelOpen, setIsPanelOpen] = useState(false);
	const [isHiddenPanelOpen, setIsHiddenPanelOpen] = useState(false);

	const [isModalOpen, setIsModalOpen] = useState(false);
	// const [showHelp, setShowHelp] = useState(false);
	const [, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [showAcknowledgement, setShowAcknowledgement] = useState(false);
	const currentlyLoadingScaffoldIdRef = useRef<number | null>(null);

  	const [showParticlesPanelOpen, setShowParticlesPanelOpen] = useState(false);
	const [showPoresPanelOpen, setShowPoresPanelOpen] = useState(true);
	const [showParticles, setShowParticles] = useState(true);
	const [showPores, setShowPores] = useState(true);
  	const [, setHasAutoHiddenEdgePores] = useState(false);
	const [areEdgePoresHidden, setAreEdgePoresHidden] = useState(false);
	// const [dimAppliedOnce, setDimAppliedOnce] = useState(true);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const resolvedScaffoldId = params.scaffoldId ? parseInt(params.scaffoldId, 10) : null;
	const canEdit = userStore.user?.roles?.includes("administrator") ?? false;

	const particleDomain = domainStore.getActiveDomain(0);
	const poreDomain = domainStore.getActiveDomain(1);
	const particleUrl = domainStore.getActiveMeshUrl(0);
	const poreUrl = domainStore.getActiveMeshUrl(1);

	// const [dimmedParticles, setDimmedParticles] = useState(true);
	const [colorfulParticles, setColorfulParticles] = useState(false); // default false => uniform color
	const dimmedParticles = !colorfulParticles;
	const [theme, setTheme] = useState<'Metallic' | 'Sunset'>('Metallic');
	const [dimmedPores, ] = useState(false);
	const [poreOpacity, ] = useState(1);
	const [particleOpacity, setParticleOpacity] = useState(1);
	const [userOverrideParticleOpacity, setUserOverrideParticleOpacity] = useState(false);
	// const [poreColor, setPoreColor] = useState(null);
	const [, setParticleColor] = useState(null);
	const [slicingActive, setSlicingActive] = useState(true);
	const [sliceXThreshold, setSliceXThreshold] = useState<number | null>(300);
	// const [sliceHiddenParticleIds, setSliceHiddenParticleIds] = useState<Set<string>>(new Set());
	const [sliceDomainBounds, setSliceDomainBounds] = useState<{
		min: THREE.Vector3;
		max: THREE.Vector3;
		} | null>(null);

	const [screenshotCategory, setScreenshotCategory] = useState<number | null>(null);
	const autoHiddenForDomainRef = useRef<number | string | null>(null);
	const hasAttemptedLoadRef = useRef(false);
	const isBusy = isLoading || domainStore.isFetchingDomain || scaffoldGroupStore.isFetchingScaffoldGroup;

	// small helper - compare two Sets of strings for equality
	const setsEqual = (a?: Set<string>, b?: Set<string>) => {
		if (a === b) return true;
		if (!a || !b) return false;
		if (a.size !== b.size) return false;

		let equal = true;
		a.forEach(v => {
			if (!b.has(v)) equal = false;
		});

		return equal;
	};

	const defaultDimmedOptions = useMemo(() => ({
		color: '#E7F6E3', 
		opacity: 1,
		// #c6c9c5
	}), []);

	const loadDomainAndGroup = useCallback(async () => {
		hasAttemptedLoadRef.current = true;
		setIsLoading(true);
		// const category = selectedCategories[0];
		let scaffoldId = selectedScaffoldId ?? resolvedScaffoldId;

		setHasAutoHiddenEdgePores(false);

		try {
			const actualId = await domainStore.visualizeDomain(scaffoldId, 0);
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
			if (group) setSelectedScaffoldGroupId(group.id);

			await Promise.all([
				domainStore.visualizeDomain(scaffoldId, 0).catch(err => {
					console.warn("Failed to visualize particles (0):", err);
				}),
				domainStore.visualizeDomain(scaffoldId, 1).catch(err => {
					console.warn("Failed to visualize pores (1):", err);
				})
			]);

			await domainStore.getDomainMetadata(1, domainStore.getActiveDomain(1)?.id);
			
		} catch (error) {
			console.warn("Failed to load scaffold group", error);
		} finally {
			setIsLoading(false);
		}
	}, [selectedScaffoldId, resolvedScaffoldId, domainStore, scaffoldGroupStore]);

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
		if (sliceDomainBounds && sliceXThreshold === null) {
			const minX = sliceDomainBounds.min.x;
			const maxX = sliceDomainBounds.max.x;
			const midpoint = (minX + maxX) / 2;
			setSliceXThreshold(midpoint);
		}
	}, [sliceDomainBounds, sliceXThreshold]);

	const poresMetadata = domainStore.getActiveMetadata(1)?.metadata;
	const poresDomainId = domainStore.getActiveDomain(1)?.id;

	useEffect(() => {
		const category = 1; // pores
		const metadata = domainStore.getActiveMetadata(category);
		const domain = domainStore.getActiveDomain(category);

		// debug: show when the effect runs and what metadata/domain we saw
		// remove or lower verbosity later
		console.debug("[auto-hide effect] showPores:", showPores, "domainId:", domain?.id ?? domain?.scaffoldId, "metadataLoaded:", !!metadata);

		if (!showPores || !metadata) {
			// nothing to do yet
			return;
		}

		// stable key for this domain's metadata
		const domainKey = (domain && (domain.id ?? domain.scaffoldId)) ?? JSON.stringify(metadata?.metadata ?? {});

		if (autoHiddenForDomainRef.current === domainKey) {
			console.debug("[auto-hide effect] already applied for domainKey:", domainKey);
			return;
		}

		// build set of edge ids
		const edgeHidden = new Set<string>();
		Object.entries(metadata.metadata || {}).forEach(([id, meta]) => {
			if (typeof meta === "object" && meta && "edge" in meta && (meta as any).edge === 1) {
			edgeHidden.add(id);
			}
		});

		console.debug("[auto-hide effect] computed edgeHidden size:", edgeHidden.size);

		setHiddenByCategory(prev => {
			const prevSet = prev[category] ?? new Set<string>();

			if (setsEqual(prevSet, edgeHidden)) {
				// no visible change but mark that we've applied it for this domain
				autoHiddenForDomainRef.current = domainKey;
				setAreEdgePoresHidden(edgeHidden.size > 0);
				setHasAutoHiddenEdgePores(true);
				return prev;
			}

			const next = { ...prev, [category]: new Set(edgeHidden) };
			autoHiddenForDomainRef.current = domainKey;
			setAreEdgePoresHidden(edgeHidden.size > 0);
			setHasAutoHiddenEdgePores(true);
			return next;
		});
		// dependencies: metadata identity and domain id — NOT the whole store object
	}, [showPores, poresMetadata, poresDomainId, domainStore]);



	// useEffect(() => {
	// 	const category = 1; // Pores
	// 	const metadata = domainStore.getActiveMetadata(category);

	// 	if (showPores && metadata && !hasAutoHiddenEdgePores) {
	// 		const edgeHidden = new Set<string>();

	// 		Object.entries(metadata.metadata).forEach(([id, meta]) => {
	// 			if (typeof meta === "object" && meta && "edge" in meta && (meta as any).edge === 1) {
	// 				edgeHidden.add(id);
	// 			}
	// 		});

	// 		setHiddenByCategory(prev => ({
	// 			...prev,
	// 			[category]: edgeHidden,
	// 		}));

	// 		setAreEdgePoresHidden(true);
	// 		setHasAutoHiddenEdgePores(true);
	// 	}
	// }, [showPores, domainStore, hasAutoHiddenEdgePores]);

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

	// useEffect(() => {
	// 	const shouldDimParticles = showParticles && showPores;

	// 	if (shouldDimParticles && !dimAppliedOnce) {
	// 		setDimmedParticles(true);
	// 		setParticleOpacity(defaultDimmedOptions.opacity);
	// 		setUserOverrideParticleOpacity(false);
	// 		setDimAppliedOnce(true); // mark as done
	// 	}
	// }, [showParticles, showPores, dimAppliedOnce, defaultDimmedOptions]);

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
			slicingActive,
  			sliceXThreshold: sliceXThreshold ?? 0,
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
			slicingActive,
  			sliceXThreshold: sliceXThreshold ?? 0,
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
		autoHiddenForDomainRef.current = null; 	
		// Reset panel open state or any visibility flags if needed
		// setShowParticlesPanelOpen(false);
		// setShowPoresPanelOpen(true);
		setShowParticles(true);
		setShowPores(true);
		// setSlicingActive(true);
		clearHistory();
	};

	const handleResetOverrides = () => {
		setParticleOpacity(1); // Restore full opacity
		setUserOverrideParticleOpacity(false); // Allow dimming logic again
		setColorfulParticles(false); // Disable dim
		setParticleColor(null);
		setSlicingActive(false);
	}

	const handleScreenshotUpload = async (blob: Blob) => {
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
			setIsLoading(false);
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
		let triggerScreenshot = false;

		try {
			setIsLoading(true);

			const formattedDomainSize = payload.domainSize.every((v) => v !== null)
			? `[${payload.domainSize.join(",")}]`
			: undefined;

			if (!payload.selectedFile) throw new Error("No mesh ile selected.")

			await domainStore.uploadDomainMesh(
				selectedScaffoldId,
				payload.selectedFile,
				payload.category,
				payload.voxelSize || undefined,
				formattedDomainSize,
				payload.metadataFile
			);

			await domainStore.visualizeDomain(selectedScaffoldId, payload.category, true);
			await domainStore.getDomainMetadata(payload.category, domainStore.getActiveDomain(payload.category)?.id);

			console.log("[Handle Form Submit]:", payload);

			const numericCategory = Number(payload.category);

			if (numericCategory === 0 || numericCategory === 1) {
				console.log(`TRIGGERING SCREENSHOT: ${payload.category}`);
				triggerScreenshot = true;
				setScaffoldIdForScreenshot(selectedScaffoldId);
				setScreenshotCategory(payload.category);
			}

			setIsModalOpen(false); // close modal
		} catch (error) {
			console.error("Upload failed", error);
			setError("Upload failed. Please try again.");
		} finally {
			// Refresh that domain after upload
			if (!triggerScreenshot) {
				setIsLoading(false);
			}
		}
	};

	const handleManualScreenshot = () => setShowAcknowledgement(true);

	const handleConfirmAcknowledgement = () => {
		const canvas = canvasRef.current;
		if (canvas) {
			canvas.toBlob((blob) => {
				if (!blob) return;
	
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `scaffold-${selectedScaffoldId}.png`;
				link.click();
				URL.revokeObjectURL(url);
			}, "image/png");
		}
		setShowAcknowledgement(false);
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
				{isBusy && (
					<div className="h-full w-full -mt-16 flex items-center justify-center">
						<div className="text-gray-600">Loading mesh...</div>
					</div>
				)}
				{!isBusy && meshList.length > 0 && (
					<div className="h-full w-full -mt-16">
						<CanvasViewer
							meshes={meshList} 
							onSliceBoundsComputed={setSliceDomainBounds} 
							onCanvasCreated={(el) => canvasRef.current = el}
							theme={theme} 
						/>
					</div>
				)}
				{!isBusy && meshList.length === 0 && hasAttemptedLoadRef.current && (
					<div className="text-gray-600">This mesh does not exist</div>
				)}
			</div>

			<div className="absolute top-0 left-0 z-20 space-y-1 ml-2">
				<SelectedPanel
					selectedDomainEntity={activeSelected}
					domainCategory={activeCategory}
					onUnselect={() => setSelectedByCategory(prev => ({ ...prev, [activeCategory]: null }))}
					domainMetadata={activeMetadata}
					scaffoldGroup={scaffoldGroupStore.selectedScaffoldGroup}
				/>
				{activeCategory != null && isActiveCategoryVisible && (
					<HiddenPanel
						isOpen={isHiddenPanelOpen}
						toggleOpen={() => setIsHiddenPanelOpen(!isHiddenPanelOpen)}
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
				)}
			</div>
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
					onScreenshot={handleManualScreenshot}
					// canEdit={canEdit}
					// onEditClick={() => setIsModalOpen(true)}
					theme={theme}
  					setTheme={setTheme}
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
					sliceDomainBounds={sliceDomainBounds}
					canEdit={canEdit}
					onEditClick={() => setIsModalOpen(true)}
					domain={particleDomain}
					colorful={colorfulParticles}
					setColorful={setColorfulParticles}
					visible={showParticles} // this controls if particles show in canvas
					onToggleVisibility={() => {handleToggleShowParticles(!showParticles)}}
					opacity={particleOpacity}
		  			setOpacity={(value: number) => {
						setParticleOpacity(value);
						setUserOverrideParticleOpacity(true);
					}}
					slicingActive={slicingActive}
					setSlicingActive={setSlicingActive}
					sliceXThreshold={sliceXThreshold}
					setSliceXThreshold={setSliceXThreshold}
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
				<div style={{ visibility: 'hidden', position: 'absolute', width: 512, height: 512, pointerEvents: 'none', zIndex: -1 }}>
					<ScreenshotViewer
						scaffoldId={scaffoldIdForScreenshot}
						category={screenshotCategory}
						onScreenshotReady={handleScreenshotUpload}
					/>
				</div>
			)}

			<AcknowledgementModal
				isOpen={showAcknowledgement}
				onClose={() => setShowAcknowledgement(false)}
				onConfirm={handleConfirmAcknowledgement}
			/>
		</div>
	);
};

export default observer(Visualization);