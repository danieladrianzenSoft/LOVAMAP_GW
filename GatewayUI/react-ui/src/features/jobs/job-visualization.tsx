import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useParams, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { useStore } from '../../app/stores/store';
import CanvasViewer from '../visualization/canvas-viewer';
import ParticlesPanel from '../visualization/particles-panel';
import PoresPanel from '../visualization/pores-panel';
import SelectedPanel from '../visualization/selected-panel';
import HiddenPanel from '../visualization/hidden-panel';
import { Domain } from '../../app/models/domain';
import { buildPoreColorMap } from '../visualization/testing/pore-color-testing';
import { useUndoManager } from '../../app/common/hooks/useUndoManager';
import useUndoShortcut from '../../app/common/hooks/undo';
import History from '../../app/helpers/History';

const JobVisualization: React.FC = () => {
	const { jobId } = useParams<{ jobId: string }>();
	const [searchParams] = useSearchParams();
	const jobType = searchParams.get('type') ?? '';
	const { jobStore } = useStore();

	const isLovamap = jobType === 'Lovamap';

	// Mesh blob URLs fetched from the API
	const [particleBlobUrl, setParticleBlobUrl] = useState<string | null>(null);
	const [poreBlobUrl, setPoreBlobUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Visibility
	const [showParticles, setShowParticles] = useState(true);
	const [showPores, setShowPores] = useState(true);

	// Interaction state
	const [hiddenByCategory, setHiddenByCategory] = useState<Record<number, Set<string>>>({
		0: new Set(),
		1: new Set(),
	});
	const [selectedByCategory, setSelectedByCategory] = useState<
		Record<number, { id: string; mesh: THREE.Mesh } | null>
	>({ 0: null, 1: null });

	// Color state
	const [colorfulParticles, setColorfulParticles] = useState(false);
	const [particleColorMode, setParticleColorMode] = useState<'diameter' | 'uniform'>('uniform');
	const [poreColorSeed, setPoreColorSeed] = useState(0);

	// Slicing (particles only)
	const [slicingActive, setSlicingActive] = useState(true);
	const [sliceXThreshold, setSliceXThreshold] = useState<number | null>(null);
	const [sliceDomainBounds, setSliceDomainBounds] = useState<{
		min: THREE.Vector3;
		max: THREE.Vector3;
	} | null>(null);

	// Opacity
	const [particleOpacity, setParticleOpacity] = useState(1);

	// Entity IDs captured from GLB (fallback for pore color map)
	const [entityIdsByCategory, setEntityIdsByCategory] = useState<
		Record<number, string[] | null>
	>({ 0: null, 1: null });

	// Edge pores state (needed by undo manager, no-op here since we have no metadata)
	const [areEdgePoresHidden, setAreEdgePoresHidden] = useState(false);

	// Panel open/close
	const [showParticlesPanelOpen, setShowParticlesPanelOpen] = useState(false);
	const [showPoresPanelOpen, setShowPoresPanelOpen] = useState(true);
	const [isHiddenPanelOpen, setIsHiddenPanelOpen] = useState(false);

	// Undo manager
	const { addToHistory, undoLastAction } = useUndoManager({
		selectedByCategory,
		setSelectedByCategory,
		hiddenByCategory,
		setHiddenByCategory,
		setShowParticles,
		setShowPores,
		setAreEdgePoresHidden,
	});
	useUndoShortcut(undoLastAction);

	// Track blob URLs for cleanup
	const particleBlobUrlRef = useRef<string | null>(null);
	const poreBlobUrlRef = useRef<string | null>(null);

	useEffect(() => {
		particleBlobUrlRef.current = particleBlobUrl;
	}, [particleBlobUrl]);
	useEffect(() => {
		poreBlobUrlRef.current = poreBlobUrl;
	}, [poreBlobUrl]);

	useEffect(() => {
		return () => {
			if (particleBlobUrlRef.current) URL.revokeObjectURL(particleBlobUrlRef.current);
			if (poreBlobUrlRef.current) URL.revokeObjectURL(poreBlobUrlRef.current);
		};
	}, []);

	// Fetch meshes on mount
	useEffect(() => {
		if (!jobId) return;
		let cancelled = false;

		const fetchMeshes = async () => {
			setLoading(true);
			setError(null);
			try {
				if (isLovamap) {
					// Lovamap: pore mesh + particle mesh
					const [poreBlob, particleBlob] = await Promise.all([
						jobStore.getJobMesh(jobId),
						jobStore.getJobParticleMesh(jobId),
					]);
					if (cancelled) return;
					if (poreBlob) setPoreBlobUrl(URL.createObjectURL(poreBlob));
					if (particleBlob) setParticleBlobUrl(URL.createObjectURL(particleBlob));
					if (!poreBlob && !particleBlob) setError('No meshes available.');
				} else {
					// Segmentation / MeshProcessing: particle mesh only via getJobMesh
					const blob = await jobStore.getJobMesh(jobId);
					if (cancelled) return;
					if (blob) setParticleBlobUrl(URL.createObjectURL(blob));
					else setError('Mesh not available.');
				}
			} catch {
				if (!cancelled) setError('Failed to load meshes.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		fetchMeshes();
		return () => { cancelled = true; };
	}, [jobId, isLovamap, jobStore]);

	// Callbacks — entity interactions
	const toggleOpenParticlePorePanels = useCallback((category: number) => {
		if (category === 0) {
			setShowParticlesPanelOpen(true);
			setShowPoresPanelOpen(false);
		} else if (category === 1) {
			setShowPoresPanelOpen(true);
			setShowParticlesPanelOpen(false);
		}
	}, []);

	const handleEntityClick = useCallback(
		(category: number, particleId: string, particle: THREE.Mesh) => {
			if (!particle || !(particle instanceof THREE.Mesh)) return;
			toggleOpenParticlePorePanels(category);

			const currentlySelected = selectedByCategory[category];
			const particleMaterial = Array.isArray(particle.material)
				? particle.material[0]
				: particle.material;

			if (currentlySelected?.id === particleId) {
				addToHistory({
					type: 'UNSELECT',
					category,
					particleId,
					previousState: { material: particleMaterial, visible: particle.visible, mesh: particle },
				});
			} else if (currentlySelected) {
				addToHistory({
					type: 'SWITCH',
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
						material: particleMaterial,
					},
				});
			} else {
				addToHistory({
					type: 'SELECT',
					category,
					particleId,
					previousState: { material: particleMaterial, visible: particle.visible, mesh: particle },
				});
			}

			setSelectedByCategory(prev => {
				if (prev[category]?.id === particleId) {
					return { ...prev, [category]: null };
				}
				return {
					...Object.fromEntries(Object.keys(prev).map(k => [k, null])),
					[category]: { id: particleId, mesh: particle },
				};
			});
		},
		[toggleOpenParticlePorePanels, selectedByCategory, addToHistory]
	);

	const handleEntityRightClick = useCallback(
		(category: number, particleId: string, _mesh: THREE.Mesh) => {
			toggleOpenParticlePorePanels(category);
			setHiddenByCategory(prev => {
				const next = new Set(prev[category]);
				const isCurrentlyHidden = next.has(particleId);
				const actionType = isCurrentlyHidden ? 'SHOW' : 'HIDE';
				if (isCurrentlyHidden) next.delete(particleId);
				else next.add(particleId);

				addToHistory({
					type: actionType,
					category,
					particleId,
					previousState: { visible: !isCurrentlyHidden },
				});

				return { ...prev, [category]: next };
			});
		},
		[toggleOpenParticlePorePanels, addToHistory]
	);

	const handleEntityIdsLoaded = useCallback(
		(category: number, ids: string[]) => {
			setEntityIdsByCategory(prev => ({ ...prev, [category]: ids }));
		},
		[]
	);

	const toggleVisibility = useCallback((id: string, category: number) => {
		setHiddenByCategory(prev => {
			const next = new Set(prev[category]);
			const wasHidden = next.has(id);
			const actionType = wasHidden ? 'SHOW' : 'HIDE';
			if (wasHidden) next.delete(id);
			else next.add(id);

			addToHistory({
				type: actionType,
				category,
				particleId: id,
				previousState: { visible: !wasHidden },
			});

			return { ...prev, [category]: next };
		});
	}, [addToHistory]);

	// Auto-init slice threshold to max (all particles visible) when bounds arrive
	useEffect(() => {
		if (sliceDomainBounds && sliceXThreshold === null) {
			setSliceXThreshold(sliceDomainBounds.max.x);
		}
	}, [sliceDomainBounds, sliceXThreshold]);

	// Pore color override map
	const poreColorOverrideMap = useMemo(() => {
		if (poreColorSeed === 0) return null;
		const fallback = entityIdsByCategory[1];
		if (fallback && fallback.length > 0) {
			return buildPoreColorMap(fallback, undefined, { shuffleSeed: poreColorSeed });
		}
		return null;
	}, [poreColorSeed, entityIdsByCategory]);

	// Dimmed particles (non-colorful)
	const defaultDimmedOptions = useMemo(
		() => ({ color: '#E7F6E3', opacity: 1 }),
		[]
	);
	const dimmedParticles = !colorfulParticles;

	const particlesIdsLoaded = useCallback(
		(ids: string[]) => handleEntityIdsLoaded(0, ids),
		[handleEntityIdsLoaded]
	);
	const poresIdsLoaded = useCallback(
		(ids: string[]) => handleEntityIdsLoaded(1, ids),
		[handleEntityIdsLoaded]
	);

	// Build mesh list for CanvasViewer
	const meshList = useMemo(() => {
		const list: any[] = [];
		if (particleBlobUrl) {
			list.push({
				url: particleBlobUrl,
				category: 0,
				visible: showParticles,
				hiddenIds: hiddenByCategory[0],
				selectedEntity: selectedByCategory[0],
				onEntityClick: handleEntityClick,
				onEntityRightClick: handleEntityRightClick,
				dimmed: dimmedParticles,
				dimmedOptions: defaultDimmedOptions,
				opacity: particleOpacity,
				slicingActive,
				sliceXThreshold,
				onEntityIdsLoaded: particlesIdsLoaded,
			});
		}
		if (poreBlobUrl) {
			list.push({
				url: poreBlobUrl,
				category: 1,
				visible: showPores,
				hiddenIds: hiddenByCategory[1],
				selectedEntity: selectedByCategory[1],
				onEntityClick: handleEntityClick,
				onEntityRightClick: handleEntityRightClick,
				dimmed: false,
				dimmedOptions: defaultDimmedOptions,
				colorOverrideMap: poreColorOverrideMap,
				onEntityIdsLoaded: poresIdsLoaded,
			});
		}
		return list;
	}, [
		particleBlobUrl,
		poreBlobUrl,
		showParticles,
		showPores,
		hiddenByCategory,
		selectedByCategory,
		handleEntityClick,
		handleEntityRightClick,
		dimmedParticles,
		defaultDimmedOptions,
		particleOpacity,
		slicingActive,
		sliceXThreshold,
		poreColorOverrideMap,
		particlesIdsLoaded,
		poresIdsLoaded,
	]);

	// Active category for Selected/Hidden panels
	const activeCategory = showParticlesPanelOpen ? 0 : showPoresPanelOpen ? 1 : 0;
	const activeSelected = selectedByCategory[activeCategory];
	const activeHidden = hiddenByCategory[activeCategory];
	const isActiveCategoryVisible = activeCategory === 0 ? showParticles : showPores;

	// Stub Domain objects so panels render controls
	const particleDomain: Domain | null = particleBlobUrl
		? ({ category: 0, originalFileName: 'particles.glb' } as Domain)
		: null;
	const poreDomain: Domain | null = poreBlobUrl
		? ({ category: 1, originalFileName: 'pores.glb' } as Domain)
		: null;

	const hasAnyMesh = !!particleBlobUrl || !!poreBlobUrl;

	const shortJobId = jobId ? jobId.slice(0, 5) : '';

	return (
		<div className="relative w-full h-[calc(100vh-4rem)] mt-8 -mb-8 overflow-hidden bg-white">
			{/* Back button */}
			<button
				className="absolute top-3 left-3 z-30 bg-white bg-opacity-80 hover:bg-opacity-100 shadow rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
				onClick={() => History.push(`/jobs/${jobId}`)}
			>
				<FaArrowLeft className="w-3 h-3" /> Jobs / {shortJobId}...
			</button>

			{/* Canvas fills viewport */}
			<div className="absolute inset-0">
				{loading ? (
					<div className="h-full w-full flex items-center justify-center bg-white">
						<FaSpinner className="animate-spin text-gray-400 w-8 h-8" />
					</div>
				) : error ? (
					<div className="h-full w-full flex items-center justify-center bg-white">
						<div className="text-center">
							<p className="text-red-500 mb-2">{error}</p>
							<button
								className="button-outline text-sm"
								onClick={() => History.push(`/jobs/${jobId}`)}
							>
								Back to Jobs
							</button>
						</div>
					</div>
				) : hasAnyMesh ? (
					<CanvasViewer
						meshes={meshList}
						onSliceBoundsComputed={setSliceDomainBounds}
					/>
				) : (
					<div className="h-full w-full flex items-center justify-center">
						<p className="text-gray-500">No meshes available for this job.</p>
					</div>
				)}
			</div>

			{/* Left panels: Selected, Hidden */}
			{hasAnyMesh && (
				<div className="absolute top-2 left-2 z-20 space-y-1 w-64" style={{ top: '3.5rem' }}>
					<SelectedPanel
						selectedDomainEntity={activeSelected}
						domainCategory={activeCategory}
						onUnselect={() =>
							setSelectedByCategory(prev => ({
								...prev,
								[activeCategory]: null,
							}))
						}
						domainMetadata={null}
					/>
					{isActiveCategoryVisible && (
						<HiddenPanel
							isOpen={isHiddenPanelOpen}
							toggleOpen={() => setIsHiddenPanelOpen(!isHiddenPanelOpen)}
							category={activeCategory}
							hiddenIds={activeHidden}
							onShowAll={() => {
								setHiddenByCategory(prev => {
									addToHistory({
										type: 'SHOW_ALL',
										category: activeCategory,
										previousState: { hiddenIds: new Set(prev[activeCategory]) },
									});
									return { ...prev, [activeCategory]: new Set() };
								});
							}}
							onToggleVisibility={id => toggleVisibility(id, activeCategory)}
						/>
					)}
				</div>
			)}

			{/* Right panels: Particles, Pores */}
			{hasAnyMesh && (
				<div className="absolute top-2 right-2 z-20 space-y-1">
					{particleBlobUrl && (
						<ParticlesPanel
							isOpen={showParticlesPanelOpen}
							togglePanelOpen={() => {
								if (!showParticlesPanelOpen) {
									setShowParticlesPanelOpen(true);
									setShowPoresPanelOpen(false);
								} else {
									setShowParticlesPanelOpen(false);
								}
							}}
							sliceDomainBounds={sliceDomainBounds}
							canEdit={false}
							onEditClick={() => {}}
							domain={particleDomain}
							colorful={colorfulParticles}
							setColorful={setColorfulParticles}
							visible={showParticles}
							onToggleVisibility={() => {
								addToHistory({ type: 'TOGGLE_MESH_VISIBILITY', category: 0, previousState: showParticles });
								setShowParticles(v => !v);
							}}
							opacity={particleOpacity}
							setOpacity={setParticleOpacity}
							slicingActive={slicingActive}
							setSlicingActive={setSlicingActive}
							sliceXThreshold={sliceXThreshold}
							setSliceXThreshold={setSliceXThreshold}
							particleColorMode={particleColorMode}
							setParticleColorMode={setParticleColorMode}
							onResetOverrides={() => {
								setColorfulParticles(false);
								setParticleColorMode('uniform');
								setParticleOpacity(1);
								setSlicingActive(false);
								setSliceXThreshold(null);
							}}
						/>
					)}
					{poreBlobUrl && (
						<PoresPanel
							isOpen={showPoresPanelOpen}
							togglePanelOpen={() => {
								if (!showPoresPanelOpen) {
									setShowPoresPanelOpen(true);
									setShowParticlesPanelOpen(false);
								} else {
									setShowPoresPanelOpen(false);
								}
							}}
							canEdit={false}
							onEditClick={() => {}}
							domain={poreDomain}
							visible={showPores}
							onToggleVisibility={() => {
								addToHistory({ type: 'TOGGLE_MESH_VISIBILITY', category: 1, previousState: showPores });
								setShowPores(v => !v);
							}}
							areEdgePoresHidden={false}
							onRefreshColors={() => setPoreColorSeed(s => s + 1)}
						/>
					)}
				</div>
			)}
		</div>
	);
};

export default JobVisualization;
