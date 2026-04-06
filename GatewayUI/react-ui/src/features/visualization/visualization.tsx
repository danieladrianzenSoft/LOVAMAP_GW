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
import { useMediaQuery } from '../../app/common/hooks/useMediaQuery';
import MobileToolbar, { MobileTab } from './mobile-toolbar';
import BottomSheet from './bottom-sheet';
import MobileFloatingChips from './mobile-floating-chips';
import { buildPoreColorMap } from './testing/pore-color-testing';
import AISearchBar from '../../app/common/ai-search-bar/ai-seach-bar';
import { DEFAULT_CATEGORY, SearchCategory, categoryToPreFilter } from '../../app/common/ai-search-bar/search-categories';
import { SearchResultsDropdown } from '../../app/common/ai-search-bar/search-results-dropdown';
import { ScaffoldGroup } from '../../app/models/scaffoldGroup';
import toast from 'react-hot-toast';
import { FaCamera } from 'react-icons/fa';
import LoadingSpinner from '../../app/common/loading-spinner/loading-spinner';

const Visualization: React.FC = () => {
	// Store access
	const { domainStore, userStore, scaffoldGroupStore, resourceStore } = useStore();
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
	const selectedScaffoldIdRef = useRef<number | null>(null);

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
	const [dimmedPores, ] = useState(false);
	const [poreOpacity, ] = useState(1);
	const [particleOpacity, setParticleOpacity] = useState(1);
	const [userOverrideParticleOpacity, setUserOverrideParticleOpacity] = useState(false);
	// const [poreColor, setPoreColor] = useState(null);
	const [, setParticleColor] = useState(null);
	const [slicingActive, setSlicingActive] = useState(true);
	const [sliceXThreshold, setSliceXThreshold] = useState<number | null>(null);
	// const [sliceHiddenParticleIds, setSliceHiddenParticleIds] = useState<Set<string>>(new Set());
	const [sliceDomainBounds, setSliceDomainBounds] = useState<{
		min: THREE.Vector3;
		max: THREE.Vector3;
		} | null>(null);

	// 0 = show baked-in pore colors from the GLB. > 0 = override with a
	// shuffled TS colormap (seed = this counter). Bump via the Randomize button.
	const [poreColorSeed, setPoreColorSeed] = useState(0);

	const [screenshotCategory, setScreenshotCategory] = useState<number | null>(null);
	const autoHiddenForDomainRef = useRef<number | string | null>(null);
	const hasAttemptedLoadRef = useRef(false);
	const isBusy = isLoading || domainStore.isFetchingDomain || scaffoldGroupStore.isFetchingScaffoldGroup;

	const isMobile = useMediaQuery('(max-width: 767px)');
	const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>(null);

	// AI search state
	const [searchResults, setSearchResults] = useState<ScaffoldGroup[]>([]);
	const [searching, setSearching] = useState(false);
	const [showSearchDropdown, setShowSearchDropdown] = useState(false);
	const [searchSelectionLoadingId, setSearchSelectionLoadingId] = useState<number | null>(null);
	const [searchCategory, setSearchCategory] = useState<SearchCategory>(DEFAULT_CATEGORY);
	const searchContainerRef = useRef<HTMLDivElement>(null);

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
		let scaffoldId = selectedScaffoldIdRef.current ?? resolvedScaffoldId ?? 0;

		setHasAutoHiddenEdgePores(false);

		try {
			const actualId = await domainStore.visualizeDomain(scaffoldId, 0);
			if (actualId != null) {
				scaffoldId = actualId;
			}
			if (!scaffoldId) {
				setIsLoading(false);
				return;
			}
			selectedScaffoldIdRef.current = scaffoldId;
			setSelectedScaffoldId(scaffoldId);
		} catch (error) {
			console.error(error);
			return;
		}

		if (!scaffoldId) return;
		currentlyLoadingScaffoldIdRef.current = scaffoldId;

		try {
			const particleDomainId = domainStore.getActiveDomain(0)?.id;
			await Promise.all([
				// Branch 1: scaffold group → diameter
				scaffoldGroupStore.loadGroupForScaffoldId(scaffoldId).then(async (group) => {
					if (group) {
						setSelectedScaffoldGroupId(group.id);
						await scaffoldGroupStore.loadDiameterForScaffoldGroup(group.id);
					}
				}),
				// Branch 2: particles metadata
				domainStore.getDomainMetadata(0, particleDomainId),
				// Branch 3: pores mesh → pores metadata
				domainStore.visualizeDomain(scaffoldId, 1).then(async () => {
					const poreDomainId = domainStore.getActiveDomain(1)?.id;
					await domainStore.getDomainMetadata(1, poreDomainId);
				}).catch(err => {
					console.warn("Failed to load pores:", err);
				})
			]);

		} catch (error) {
			console.warn("Failed to load scaffold group", error);
		} finally {
			setIsLoading(false);
		}
	}, [resolvedScaffoldId, domainStore, scaffoldGroupStore]);

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

	const poreColorOverrideMap = useMemo(() => {
		if (poreColorSeed === 0) return null;
		const meta = domainStore.getActiveMetadata(1);
		if (!meta?.ids) return null;
		return buildPoreColorMap(meta.ids, undefined, { shuffleSeed: poreColorSeed });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [poreColorSeed, poresMetadata, poresDomainId]);

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

			const scaffoldId = selectedScaffoldIdRef.current ?? resolvedScaffoldId;
			if (!scaffoldId) return;

			const loadedId = await domainStore.visualizeDomain(scaffoldId, category);
			if (loadedId != null) {
			await domainStore.getDomainMetadata(category, domainStore.getActiveDomain(category)?.id);
			}
		},
		[domainStore, resolvedScaffoldId]
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
  			sliceXThreshold: sliceXThreshold,
			opacity: userOverrideParticleOpacity ? particleOpacity : undefined,
			dimmedOptions: defaultDimmedOptions,
			debugMode: debugMode,
			diameterValues: scaffoldGroupStore.diameterValues,
			idToIndex: domainStore.getActiveMetadata(0)?.id_to_index,
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
			// Pores do NOT participate in slicing – omit slicingActive and sliceXThreshold
			opacity: poreOpacity,
			dimmedOptions: defaultDimmedOptions,
			debugMode: debugMode,
			colorOverrideMap: poreColorOverrideMap
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

	// Core reset+load for switching the viewer to a new scaffold id. Shared
	// by the InfoPanel dropdown and the AI search bar selection.
	const switchToScaffold = useCallback(async (newScaffoldId: number) => {
		// Clear all existing domain state
		domainStore.clearDomainMesh(0);
		domainStore.clearDomainMesh(1);

		// Reset local state
		selectedScaffoldIdRef.current = newScaffoldId;
		setSelectedScaffoldId(newScaffoldId);
		setSelectedByCategory((prev) => ({
		...Object.fromEntries(Object.keys(prev).map((key) => [key, null]))
		}));
		setHiddenByCategory({ 0: new Set(), 1: new Set() });
		setScaffoldIdForScreenshot(null);
		setHasAutoHiddenEdgePores(false);
		autoHiddenForDomainRef.current = null;
		// Reset slice state so new scaffold computes fresh bounds/midpoint
		setSliceDomainBounds(null);
		setSliceXThreshold(null);
		setShowParticles(true);
		setShowPores(true);
		setPoreColorSeed(0);
		clearHistory();

		await loadDomainAndGroup();
	}, [domainStore, clearHistory, loadDomainAndGroup]);

	const handleScaffoldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newScaffoldId = parseInt(e.target.value, 10);
		switchToScaffold(newScaffoldId);
	};

	const runSearch = async (query: string) => {
		setSearching(true);
		setShowSearchDropdown(true);
		const pre = categoryToPreFilter(searchCategory);
		await scaffoldGroupStore.searchScaffoldGroups(query, {
			isSimulated: pre.isSimulated,
			shapeTagNames: pre.shapeTagName ? [pre.shapeTagName] : undefined,
		});
		setSearchResults(scaffoldGroupStore.segmentedScaffoldGroups.exact || []);
		setSearching(false);
	};

	const loadCategoryResults = async (cat: SearchCategory) => {
		if (cat.key === 'all') {
			setSearchResults([]);
			setShowSearchDropdown(false);
			return;
		}
		setSearching(true);
		setShowSearchDropdown(true);
		const pre = categoryToPreFilter(cat);
		let tagsForFilter;
		if (pre.shapeTagName) {
			const tags = await resourceStore.getAutogeneratedTags();
			const match = tags?.find(
				t => t.referenceProperty === 'shape' && t.name.toLowerCase() === pre.shapeTagName!.toLowerCase()
			);
			if (match) tagsForFilter = [match];
		}
		// TODO: paginate when scaffold groups > ~200
		const groups = await scaffoldGroupStore.getPublicScaffoldGroups({
			restrictToPublicationDataset: false,
			isSimulated: pre.isSimulated ?? null,
			selectedTags: tagsForFilter,
		});
		setSearchResults(groups || []);
		setSearching(false);
	};

	const handleCategoryChange = async (cat: SearchCategory, currentInput: string) => {
		setSearchCategory(cat);
		if (currentInput.trim().length > 0) return;
		await loadCategoryResults(cat);
	};

	const handleSelectFromSearch = async (groupId: number) => {
		const group = searchResults.find(g => g.id === groupId);
		if (!group) return;
		const targetScaffoldId =
			group.scaffoldIdsWithDomains?.[0] || group.scaffoldIds?.[0];
		if (!targetScaffoldId) {
			toast.error('This scaffold group has no viewable mesh.');
			return;
		}
		setSearchSelectionLoadingId(groupId);
		try {
			scaffoldGroupStore.setSelectedScaffoldGroup(group);
			await switchToScaffold(targetScaffoldId);
		} finally {
			setSearchSelectionLoadingId(null);
			setShowSearchDropdown(false);
		}
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchContainerRef.current &&
				!searchContainerRef.current.contains(event.target as Node)
			) {
				setShowSearchDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

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

	const handleMobileTabChange = async (tab: MobileTab) => {
		if (tab === 'particles') {
			await ensureDomainLoaded(0);
		} else if (tab === 'pores') {
			await ensureDomainLoaded(1);
		}
		setActiveMobileTab(tab);
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

	const meshMissing = !isBusy && meshList.length === 0 && hasAttemptedLoadRef.current;

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
		<div className={`relative w-full h-[calc(100vh-4rem)] mt-8 -mb-8 overflow-hidden flex flex-col ${isMobile ? 'ml-0 pb-14' : 'ml-2'}`}>
			{/* Header: title, subtitle, search */}
			<div className="flex-shrink-0 px-2 pb-2 md:pb-4">
				<h1 className="text-xl md:text-3xl font-bold text-gray-900 leading-tight">
					LOVAMAP playground
				</h1>
				<p className="text-sm md:text-base text-gray-700 mt-1 py-2">
					Rotate, select, hide, slice, zoom and get the details about the particle scaffolds and pores in our library
				</p>
				<div
					ref={searchContainerRef}
					className="relative w-full md:max-w-[32rem] mt-2 md:mt-3 pb-2"
				>
					<AISearchBar
						onSearch={runSearch}
						onClear={() => loadCategoryResults(searchCategory)}
						onClick={() => {
							if (searchResults.length > 0) setShowSearchDropdown(true);
						}}
						category={searchCategory}
						onCategoryChange={handleCategoryChange}
					/>
					{showSearchDropdown && (
						<SearchResultsDropdown
							results={searchResults}
							isLoading={searching}
							onSelect={handleSelectFromSearch}
							loadingSelection={searchSelectionLoadingId}
						/>
					)}
				</div>
			</div>

			{/* Canvas area with floating panels */}
			<div className="relative flex-1 min-h-0 w-full overflow-hidden">
				<div className="absolute left-0 right-0 -top-[10%] h-[110%] rounded-lg">
					{isBusy && (
						<div className="h-full w-full flex items-center justify-center">
							<LoadingSpinner text="Loading mesh..." />
						</div>
					)}
					{!isBusy && meshList.length > 0 && (
						<div className="h-full w-full">
							<CanvasViewer
								meshes={meshList}
								onSliceBoundsComputed={setSliceDomainBounds}
								onCanvasCreated={(el) => canvasRef.current = el}
							/>
						</div>
					)}
					{meshMissing && (
						<div className="h-full w-full flex flex-col items-center justify-center gap-3">
							<div className="text-gray-700 text-base md:text-lg">This mesh does not exist</div>
							<button
								className="button-outline"
								onClick={() => History.push('/explore')}
							>
								Browse Scaffolds
							</button>
						</div>
					)}
				</div>

			{/* Floating screenshot button (desktop only) */}
			{!isMobile && !meshMissing && (
				<button
					onClick={handleManualScreenshot}
					title="Take a screenshot"
					className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 hover:shadow-xl transition"
				>
					<span className="text-sm font-medium text-gray-800">Take a screenshot</span>
					<FaCamera className="text-gray-600" />
				</button>
			)}

			{/* Desktop panels — unchanged */}
			{!isMobile && !meshMissing && (
				<>
					<div className="absolute top-[5%] left-0 z-20 space-y-1 ml-2">
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
										const prevHidden = new Set(prev[activeCategory]);
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
					<div className="absolute top-[5%] right-0 z-20 space-y-1 mr-2">
						<button className="button-primary items-center content-center w-full mb-2" onClick={() => History.push('/explore')}>
							Explore More
						</button>

						<InfoPanel
							isOpen={isPanelOpen}
							toggleOpen={() => setIsPanelOpen(!isPanelOpen)}
							scaffoldGroup={scaffoldGroupStore.selectedScaffoldGroup}
							selectedScaffoldId={selectedScaffoldId}
							onScaffoldChange={handleScaffoldChange}
							selectedCategories={selectedCategories}
							onCategoryChange={setSelectedCategories}
							domain={particleDomain}
							isLoading={scaffoldGroupStore.isFetchingScaffoldGroup}
						/>

						<ParticlesPanel
							isOpen={showParticlesPanelOpen}
							togglePanelOpen={async () => {
								if (!showParticlesPanelOpen) {
									await ensureDomainLoaded(0);
									setShowParticlesPanelOpen(true);
									setShowPoresPanelOpen(false);
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
							visible={showParticles}
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
									await ensureDomainLoaded(1);
									setShowPoresPanelOpen(true);
									setShowParticlesPanelOpen(false);
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
							onRefreshColors={() => setPoreColorSeed(s => s + 1)}
						/>
					</div>
				</>
			)}
			</div>
			{/* /canvas area */}

			{/* Mobile layout */}
			{isMobile && (
				<>
					{!meshMissing && (
					<MobileFloatingChips
						activeCategory={activeCategory}
						selectedEntity={activeSelected}
						onUnselect={() => setSelectedByCategory(prev => ({ ...prev, [activeCategory]: null }))}
						domainMetadata={activeMetadata}
						scaffoldGroup={scaffoldGroupStore.selectedScaffoldGroup}
						hiddenIds={activeHidden}
						isHiddenPanelOpen={isHiddenPanelOpen}
						toggleHiddenPanel={() => setIsHiddenPanelOpen(!isHiddenPanelOpen)}
						onShowAll={() => {
							setHiddenByCategory((prev) => {
								const prevHidden = new Set(prev[activeCategory]);
								addToHistory({
									type: 'SHOW_ALL',
									category: activeCategory,
									previousState: { hiddenIds: prevHidden },
								});
								return { ...prev, [activeCategory]: new Set() };
							});
						}}
						onToggleVisibility={(id) => toggleVisibility(id, activeCategory)}
						isActiveCategoryVisible={isActiveCategoryVisible}
					/>
					)}

					<BottomSheet
						isOpen={activeMobileTab === 'info'}
						onClose={() => setActiveMobileTab(null)}
					>
						<InfoPanel
							isOpen={true}
							toggleOpen={() => {}}
							scaffoldGroup={scaffoldGroupStore.selectedScaffoldGroup}
							selectedScaffoldId={selectedScaffoldId}
							onScaffoldChange={handleScaffoldChange}
							selectedCategories={selectedCategories}
							onCategoryChange={setSelectedCategories}
							domain={particleDomain}
							onScreenshot={handleManualScreenshot}
							isLoading={scaffoldGroupStore.isFetchingScaffoldGroup}
							className="w-full bg-transparent shadow-none p-0"
						/>
					</BottomSheet>

					<BottomSheet
						isOpen={activeMobileTab === 'particles'}
						onClose={() => setActiveMobileTab(null)}
					>
						<ParticlesPanel
							isOpen={true}
							togglePanelOpen={() => {}}
							sliceDomainBounds={sliceDomainBounds}
							canEdit={canEdit}
							onEditClick={() => setIsModalOpen(true)}
							domain={particleDomain}
							colorful={colorfulParticles}
							setColorful={setColorfulParticles}
							visible={showParticles}
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
							className="w-full bg-transparent shadow-none p-0"
						/>
					</BottomSheet>

					<BottomSheet
						isOpen={activeMobileTab === 'pores'}
						onClose={() => setActiveMobileTab(null)}
					>
						<PoresPanel
							isOpen={true}
							togglePanelOpen={() => {}}
							canEdit={canEdit}
							onEditClick={() => setIsModalOpen(true)}
							domain={poreDomain}
							visible={showPores}
							onToggleVisibility={() => {handleToggleShowPores(!showPores)}}
							areEdgePoresHidden={areEdgePoresHidden}
							onToggleHideEdgePores={handleToggleHideEdgePores}
							onRefreshColors={() => setPoreColorSeed(s => s + 1)}
							className="w-full bg-transparent shadow-none p-0"
						/>
					</BottomSheet>

					<MobileToolbar
						activeTab={activeMobileTab}
						onTabChange={handleMobileTabChange}
					/>
				</>
			)}

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