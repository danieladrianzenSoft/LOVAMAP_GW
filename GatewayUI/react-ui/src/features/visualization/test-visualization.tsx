import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useDropzone } from 'react-dropzone';
import CanvasViewer from './canvas-viewer';
import ParticlesPanel from './particles-panel';
import PoresPanel from './pores-panel';
import SelectedPanel from './selected-panel';
import HiddenPanel from './hidden-panel';
import UploadFile from '../../app/common/upload-file/upload-file';
import { DomainMetadata } from '../../app/models/domainMetadata';
import { Domain } from '../../app/models/domain';
import { buildPoreColorMap } from './testing/pore-color-testing';

const TEST_VIZ_ACCEPTED_TYPES = {
	'model/gltf-binary': ['.glb'],
	'model/gltf+json': ['.gltf'],
	'application/json': ['.json'],
};

// Ephemeral mesh viewer for admins: drop local .glb/.gltf meshes and optional
// metadata .json files. Files are auto-routed by filename substring (pore /
// particle) and served to three.js via blob: URLs that live only in this tab.
// Mirrors visualization.tsx layout and interactions so you can iterate on the
// full scene without round-tripping through the backend or DB.

type CategoryData = {
	url: string; // blob URL for the GLB
	fileName: string;
	metadata: DomainMetadata | null;
	metadataFileName?: string;
};

type CategoryKey = 0 | 1; // 0 = particles, 1 = pores

// Loose runtime validation for dropped JSON: must be a plain object. The
// DomainMetadata fields (ids / id_to_index / metadata) are all optional, so
// we accept anything object-shaped and let downstream code guard on each.
function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Categorize a dropped file by its extension (type) and filename (category).
// Returns null for unsupported file types.
function classifyFile(file: File): {
	kind: 'mesh' | 'metadata';
	category: CategoryKey;
} | null {
	const lower = file.name.toLowerCase();
	const isMesh = lower.endsWith('.glb') || lower.endsWith('.gltf');
	const isJson = lower.endsWith('.json');
	if (!isMesh && !isJson) return null;

	let category: CategoryKey = 0; // default to particles
	if (lower.includes('pore')) category = 1;
	else if (lower.includes('particle')) category = 0;

	return { kind: isMesh ? 'mesh' : 'metadata', category };
}

// Small helper - compare two Sets of strings for equality.
function setsEqual(a?: Set<string>, b?: Set<string>): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	if (a.size !== b.size) return false;
	let equal = true;
	a.forEach(v => {
		if (!b.has(v)) equal = false;
	});
	return equal;
}

const TestVisualization: React.FC = () => {
	// Category data — each slot holds a GLB blob URL and optional metadata.
	const [particles, setParticles] = useState<CategoryData | null>(null);
	const [pores, setPores] = useState<CategoryData | null>(null);

	// Mirrors visualization.tsx patterns
	const [showParticles, setShowParticles] = useState(true);
	const [showPores, setShowPores] = useState(true);
	const [hiddenByCategory, setHiddenByCategory] = useState<
		Record<number, Set<string>>
	>({ 0: new Set(), 1: new Set() });
	const [selectedByCategory, setSelectedByCategory] = useState<
		Record<number, { id: string; mesh: THREE.Mesh } | null>
	>({ 0: null, 1: null });

	const [colorfulParticles, setColorfulParticles] = useState(false);
	const [poreColorSeed, setPoreColorSeed] = useState(0);
	const [areEdgePoresHidden, setAreEdgePoresHidden] = useState(false);

	const [showParticlesPanelOpen, setShowParticlesPanelOpen] = useState(false);
	const [showPoresPanelOpen, setShowPoresPanelOpen] = useState(true);
	const [isHiddenPanelOpen, setIsHiddenPanelOpen] = useState(false);

	// Entity ids captured from each GLB (fallback for pore color map when
	// metadata is missing).
	const [entityIdsByCategory, setEntityIdsByCategory] = useState<
		Record<number, string[] | null>
	>({ 0: null, 1: null });

	// Transient status line for drop-zone feedback (e.g. bad JSON parse).
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [isAddFilesModalOpen, setIsAddFilesModalOpen] = useState(false);

	// Track the domain key we've already auto-hidden edge pores for, so
	// re-renders don't clobber the user's manual toggling.
	const autoHiddenForDomainRef = useRef<string | null>(null);

	// Track blob URLs so we can revoke them on replacement or unmount.
	const particlesUrlRef = useRef<string | null>(null);
	const poresUrlRef = useRef<string | null>(null);

	useEffect(() => {
		particlesUrlRef.current = particles?.url ?? null;
	}, [particles?.url]);

	useEffect(() => {
		poresUrlRef.current = pores?.url ?? null;
	}, [pores?.url]);

	useEffect(() => {
		return () => {
			if (particlesUrlRef.current) URL.revokeObjectURL(particlesUrlRef.current);
			if (poresUrlRef.current) URL.revokeObjectURL(poresUrlRef.current);
			if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
		};
	}, []);

	const flashStatus = useCallback((msg: string) => {
		setStatusMessage(msg);
		if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
		statusTimerRef.current = setTimeout(() => setStatusMessage(null), 4000);
	}, []);

	// Core intake: classify each file by extension + filename substring, load
	// its contents, and write it into the matching category slot. Replacing a
	// slot's GLB revokes the previous blob URL.
	const ingestFiles = useCallback(
		async (files: File[]) => {
			if (files.length === 0) return;

			// Batch updates per category so multiple files dropped together
			// apply in a single render pass.
			type SlotUpdate = {
				meshFile?: File; // last mesh file wins if duplicates
				metadata?: DomainMetadata;
				metadataFileName?: string;
			};
			const updates: Record<CategoryKey, SlotUpdate> = { 0: {}, 1: {} };
			const skipped: string[] = [];

			for (const file of files) {
				const classified = classifyFile(file);
				if (!classified) {
					skipped.push(file.name);
					continue;
				}

				const { kind, category } = classified;
				if (kind === 'mesh') {
					updates[category].meshFile = file;
				} else {
					try {
						const text = await file.text();
						const parsed = JSON.parse(text);
						if (!isPlainObject(parsed)) {
							console.warn(
								`[test-visualization] skipping ${file.name}: JSON root is not an object`
							);
							skipped.push(file.name);
							continue;
						}
						updates[category].metadata = parsed as DomainMetadata;
						updates[category].metadataFileName = file.name;
					} catch (err) {
						console.warn(
							`[test-visualization] failed to parse ${file.name}:`,
							err
						);
						skipped.push(file.name);
					}
				}
			}

			// Revoke old mesh blob URLs BEFORE creating new ones — refs hold
			// the currently-rendered urls, side effects outside state updaters
			// so strict-mode double-invoke stays clean.
			const newParticlesMeshUrl = updates[0].meshFile
				? URL.createObjectURL(updates[0].meshFile)
				: null;
			const newPoresMeshUrl = updates[1].meshFile
				? URL.createObjectURL(updates[1].meshFile)
				: null;
			if (newParticlesMeshUrl && particlesUrlRef.current) {
				URL.revokeObjectURL(particlesUrlRef.current);
			}
			if (newPoresMeshUrl && poresUrlRef.current) {
				URL.revokeObjectURL(poresUrlRef.current);
			}

			const applyToSlot = (
				prev: CategoryData | null,
				update: SlotUpdate,
				newMeshUrl: string | null
			): CategoryData | null => {
				if (!update.meshFile && update.metadata === undefined) return prev;
				const base: CategoryData = prev ?? {
					url: '',
					fileName: '',
					metadata: null,
				};
				const merged: CategoryData = {
					...base,
					...(newMeshUrl && update.meshFile
						? { url: newMeshUrl, fileName: update.meshFile.name }
						: {}),
					...(update.metadata !== undefined
						? {
								metadata: update.metadata,
								metadataFileName: update.metadataFileName,
						  }
						: {}),
				};
				// Metadata without a mesh is useless — skip creating the slot.
				if (!merged.url) return prev;
				return merged;
			};

			// Apply particles
			if (updates[0].meshFile || updates[0].metadata !== undefined) {
				setParticles(prev => applyToSlot(prev, updates[0], newParticlesMeshUrl));
				if (newParticlesMeshUrl) {
					// Reset per-category state that depends on the mesh identity.
					setHiddenByCategory(prev => ({ ...prev, 0: new Set() }));
					setSelectedByCategory(prev => ({ ...prev, 0: null }));
					setEntityIdsByCategory(prev => ({ ...prev, 0: null }));
				}
			}
			// Apply pores
			if (updates[1].meshFile || updates[1].metadata !== undefined) {
				setPores(prev => applyToSlot(prev, updates[1], newPoresMeshUrl));
				if (newPoresMeshUrl) {
					setHiddenByCategory(prev => ({ ...prev, 1: new Set() }));
					setSelectedByCategory(prev => ({ ...prev, 1: null }));
					setEntityIdsByCategory(prev => ({ ...prev, 1: null }));
					setPoreColorSeed(0);
					autoHiddenForDomainRef.current = null;
					setAreEdgePoresHidden(false);
				}
			}

			if (skipped.length > 0) {
				flashStatus(`Skipped: ${skipped.join(', ')}`);
			}
		},
		[flashStatus]
	);

	// Manual reassignment from the Files panel dropdown: move a loaded slot
	// from one category to the other (preserves blob URL, retitles metadata).
	const reassignCategory = useCallback(
		(from: CategoryKey, to: CategoryKey) => {
			if (from === to) return;
			const source = from === 0 ? particles : pores;
			if (!source) return;

			// Revoke whatever blob URL lives in the destination slot (if any).
			const destRef = to === 0 ? particlesUrlRef : poresUrlRef;
			if (destRef.current && destRef.current !== source.url) {
				URL.revokeObjectURL(destRef.current);
			}

			if (to === 0) {
				setParticles(source);
				setPores(null);
			} else {
				setPores(source);
				setParticles(null);
			}

			// Reset transient per-category state. Move captured entity ids
			// from the source category to the destination, since the Model
			// instance is reused (same blob URL → same key) and won't fire
			// onEntityIdsLoaded again.
			setHiddenByCategory({ 0: new Set(), 1: new Set() });
			setSelectedByCategory({ 0: null, 1: null });
			setEntityIdsByCategory(prev => ({
				0: to === 0 ? prev[from] ?? null : null,
				1: to === 1 ? prev[from] ?? null : null,
			}));
			setPoreColorSeed(0);
			autoHiddenForDomainRef.current = null;
			setAreEdgePoresHidden(false);
		},
		[particles, pores]
	);

	const removeSlot = useCallback((category: CategoryKey) => {
		const ref = category === 0 ? particlesUrlRef : poresUrlRef;
		if (ref.current) URL.revokeObjectURL(ref.current);
		if (category === 0) setParticles(null);
		else setPores(null);
		setHiddenByCategory(prev => ({ ...prev, [category]: new Set() }));
		setSelectedByCategory(prev => ({ ...prev, [category]: null }));
		setEntityIdsByCategory(prev => ({ ...prev, [category]: null }));
		if (category === 1) {
			setPoreColorSeed(0);
			autoHiddenForDomainRef.current = null;
			setAreEdgePoresHidden(false);
		}
	}, []);

	const clearAll = useCallback(() => {
		if (particlesUrlRef.current) URL.revokeObjectURL(particlesUrlRef.current);
		if (poresUrlRef.current) URL.revokeObjectURL(poresUrlRef.current);
		setParticles(null);
		setPores(null);
		setHiddenByCategory({ 0: new Set(), 1: new Set() });
		setSelectedByCategory({ 0: null, 1: null });
		setEntityIdsByCategory({ 0: null, 1: null });
		setPoreColorSeed(0);
		autoHiddenForDomainRef.current = null;
		setAreEdgePoresHidden(false);
	}, []);

	// Entity-click: toggle-select within a category, and flip the open panel.
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
			setSelectedByCategory(prev => {
				const current = prev[category];
				if (current?.id === particleId) {
					return { ...prev, [category]: null };
				}
				return {
					...Object.fromEntries(Object.keys(prev).map(k => [k, null])),
					[category]: { id: particleId, mesh: particle },
				};
			});
		},
		[toggleOpenParticlePorePanels]
	);

	const handleEntityRightClick = useCallback(
		(category: number, particleId: string, _mesh: THREE.Mesh) => {
			toggleOpenParticlePorePanels(category);
			setHiddenByCategory(prev => {
				const next = new Set(prev[category]);
				if (next.has(particleId)) next.delete(particleId);
				else next.add(particleId);
				return { ...prev, [category]: next };
			});
		},
		[toggleOpenParticlePorePanels]
	);

	const handleEntityIdsLoaded = useCallback(
		(category: number, ids: string[]) => {
			console.debug('[test-viz] onEntityIdsLoaded', {
				category,
				count: ids.length,
				sample: ids.slice(0, 3),
			});
			setEntityIdsByCategory(prev => ({ ...prev, [category]: ids }));
		},
		[]
	);

	// Mirrors visualization.tsx:197-203: when a seed is set, build a color
	// override map keyed by entity id. Prefer metadata.ids (matches the GLB
	// baking order); fall back to ids captured from the GLB itself.
	const poreColorOverrideMap = useMemo(() => {
		if (poreColorSeed === 0) return null;
		const metaIds = pores?.metadata?.ids;
		if (metaIds && metaIds.length > 0) {
			const map = buildPoreColorMap(metaIds, undefined, {
				shuffleSeed: poreColorSeed,
			});
			console.debug('[test-viz] poreColorOverrideMap from metadata.ids', {
				seed: poreColorSeed,
				idCount: metaIds.length,
				sampleKeys: Object.keys(map).slice(0, 3),
				sampleValues: Object.values(map).slice(0, 3),
			});
			return map;
		}
		const fallback = entityIdsByCategory[1];
		if (fallback && fallback.length > 0) {
			const map = buildPoreColorMap(fallback, undefined, {
				shuffleSeed: poreColorSeed,
			});
			console.debug('[test-viz] poreColorOverrideMap from GLB ids', {
				seed: poreColorSeed,
				idCount: fallback.length,
				sampleKeys: Object.keys(map).slice(0, 3),
				sampleValues: Object.values(map).slice(0, 3),
			});
			return map;
		}
		console.debug('[test-viz] poreColorOverrideMap: no ids available', {
			seed: poreColorSeed,
			hasMetaIds: !!metaIds,
			hasFallback: !!fallback,
			fallbackLen: fallback?.length,
		});
		return null;
	}, [poreColorSeed, pores?.metadata, entityIdsByCategory]);

	// Ported from visualization.tsx:205-255: auto-hide edge pores once per
	// loaded pore metadata. Skips silently when metadata is missing.
	useEffect(() => {
		const category = 1;
		const metadata = pores?.metadata;
		if (!showPores || !metadata) return;

		const domainKey =
			pores?.metadataFileName ??
			pores?.fileName ??
			JSON.stringify(metadata.metadata ?? {});

		if (autoHiddenForDomainRef.current === domainKey) return;

		const edgeHidden = new Set<string>();
		Object.entries(metadata.metadata || {}).forEach(([id, meta]) => {
			if (
				typeof meta === 'object' &&
				meta &&
				'edge' in (meta as object) &&
				(meta as any).edge === 1
			) {
				edgeHidden.add(id);
			}
		});

		setHiddenByCategory(prev => {
			const prevSet = prev[category] ?? new Set<string>();
			if (setsEqual(prevSet, edgeHidden)) {
				autoHiddenForDomainRef.current = domainKey;
				setAreEdgePoresHidden(edgeHidden.size > 0);
				return prev;
			}
			const next = { ...prev, [category]: new Set(edgeHidden) };
			autoHiddenForDomainRef.current = domainKey;
			setAreEdgePoresHidden(edgeHidden.size > 0);
			return next;
		});
	}, [showPores, pores?.metadata, pores?.fileName, pores?.metadataFileName]);

	const handleToggleHideEdgePores = useCallback(
		(hide: boolean) => {
			const metadata = pores?.metadata;
			if (!metadata) return;
			const newHidden = new Set(hiddenByCategory[1]);
			Object.entries(metadata.metadata || {}).forEach(([id, meta]) => {
				if (
					typeof meta === 'object' &&
					meta &&
					'edge' in (meta as object) &&
					(meta as any).edge === 1
				) {
					if (hide) newHidden.add(id);
					else newHidden.delete(id);
				}
			});
			setHiddenByCategory(prev => ({ ...prev, 1: newHidden }));
			setAreEdgePoresHidden(hide);
		},
		[pores?.metadata, hiddenByCategory]
	);

	const toggleVisibility = useCallback((id: string, category: number) => {
		setHiddenByCategory(prev => {
			const next = new Set(prev[category]);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return { ...prev, [category]: next };
		});
	}, []);

	// Build the mesh list for CanvasViewer, mirroring visualization.tsx:420-457.
	// We skip slicing entirely (not needed for the test viewer) but keep the
	// dimmedOptions / dimmed wiring so colorful-particles flips render style.
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

	const meshList = useMemo(() => {
		const list: any[] = [];
		if (particles) {
			list.push({
				url: particles.url,
				category: 0,
				visible: showParticles,
				hiddenIds: hiddenByCategory[0],
				selectedEntity: selectedByCategory[0],
				onEntityClick: handleEntityClick,
				onEntityRightClick: handleEntityRightClick,
				dimmed: dimmedParticles,
				dimmedOptions: defaultDimmedOptions,
				idToIndex: particles.metadata?.id_to_index,
				onEntityIdsLoaded: particlesIdsLoaded,
			});
		}
		if (pores) {
			list.push({
				url: pores.url,
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
		particles,
		pores,
		showParticles,
		showPores,
		hiddenByCategory,
		selectedByCategory,
		handleEntityClick,
		handleEntityRightClick,
		dimmedParticles,
		defaultDimmedOptions,
		poreColorOverrideMap,
		particlesIdsLoaded,
		poresIdsLoaded,
	]);

	// Active category tracks which panel is open — drives the Selected /
	// Hidden panels on the left, same as visualization.tsx:673-680.
	const activeCategory: CategoryKey = showParticlesPanelOpen
		? 0
		: showPoresPanelOpen
		? 1
		: 0;
	const activeSelected = selectedByCategory[activeCategory];
	const activeHidden = hiddenByCategory[activeCategory];
	const activeMetadata: DomainMetadata | null =
		activeCategory === 0
			? particles?.metadata ?? null
			: pores?.metadata ?? null;
	const isActiveCategoryVisible =
		activeCategory === 0 ? showParticles : showPores;

	// Stub Domain objects so panels render their contents (panels only check
	// truthy-ness of `domain` to decide whether to show controls vs.
	// "Non-existent domain").
	const particleDomain: Domain | null = particles
		? { category: 0, originalFileName: particles.fileName }
		: null;
	const poreDomain: Domain | null = pores
		? { category: 1, originalFileName: pores.fileName }
		: null;

	const hasAnyFile = !!particles || !!pores;

	// Drop zone — noClick so the drop overlay doesn't intercept canvas clicks.
	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		onDrop: ingestFiles,
		noClick: true,
		noKeyboard: true,
		multiple: true,
	});

	return (
		<div
			{...getRootProps()}
			className="relative w-full h-[calc(100vh-4rem)] mt-8 -mb-8 overflow-hidden"
		>
			<input {...getInputProps()} />

			{/* Canvas fills the viewport */}
			<div className="absolute inset-0">
				{hasAnyFile ? (
					<CanvasViewer meshes={meshList} />
				) : (
					<div className="h-full w-full flex items-center justify-center">
						<div className="max-w-md text-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg bg-white bg-opacity-70">
							<p className="text-lg font-semibold text-gray-800 mb-2">
								Drop mesh + metadata files anywhere
							</p>
							<p className="text-sm text-gray-600 mb-4">
								Accepts <code>.glb</code> / <code>.gltf</code> meshes and{' '}
								<code>.json</code> metadata. Files with "pore" or "particle" in
								the name are auto-routed.
							</p>
							<button
								type="button"
								className="button-outline text-sm"
								onClick={open}
							>
								Or click to select files
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Drag-over overlay while loaded */}
			{hasAnyFile && isDragActive && (
				<div className="pointer-events-none absolute inset-0 z-30 bg-blue-500 bg-opacity-10 border-4 border-dashed border-blue-500 flex items-center justify-center">
					<div className="bg-white bg-opacity-90 rounded-lg px-4 py-2 shadow text-gray-800 text-sm font-semibold">
						Drop to add files
					</div>
				</div>
			)}

			{/* Transient status line */}
			{statusMessage && (
				<div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-yellow-100 border border-yellow-300 text-yellow-900 text-xs px-3 py-1 rounded shadow">
					{statusMessage}
				</div>
			)}

			{/* Left stack: Files panel, Selected panel, Hidden panel */}
			{hasAnyFile && (
				<div className="absolute top-2 left-2 z-20 space-y-1 w-64">
					<FilesPanel
						particles={particles}
						pores={pores}
						onReassign={reassignCategory}
						onRemove={removeSlot}
						onAddMore={() => setIsAddFilesModalOpen(true)}
						onClearAll={clearAll}
					/>
					<SelectedPanel
						selectedDomainEntity={activeSelected}
						domainCategory={activeCategory}
						onUnselect={() =>
							setSelectedByCategory(prev => ({
								...prev,
								[activeCategory]: null,
							}))
						}
						domainMetadata={activeMetadata}
					/>
					{isActiveCategoryVisible && (
						<HiddenPanel
							isOpen={isHiddenPanelOpen}
							toggleOpen={() => setIsHiddenPanelOpen(!isHiddenPanelOpen)}
							category={activeCategory}
							hiddenIds={activeHidden}
							onShowAll={() =>
								setHiddenByCategory(prev => ({
									...prev,
									[activeCategory]: new Set(),
								}))
							}
							onToggleVisibility={id => toggleVisibility(id, activeCategory)}
						/>
					)}
				</div>
			)}

			{/* Right stack: Particles + Pores panels */}
			{hasAnyFile && (
				<div className="absolute top-2 right-2 z-20 space-y-1">
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
						sliceDomainBounds={null}
						canEdit={false}
						onEditClick={() => {}}
						domain={particleDomain}
						colorful={colorfulParticles}
						setColorful={setColorfulParticles}
						visible={showParticles}
						onToggleVisibility={() => setShowParticles(v => !v)}
						opacity={1}
						setOpacity={() => {}}
						slicingActive={false}
						setSlicingActive={() => {}}
						sliceXThreshold={null}
						setSliceXThreshold={() => {}}
						onResetOverrides={() => setColorfulParticles(false)}
					/>
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
						onToggleVisibility={() => setShowPores(v => !v)}
						areEdgePoresHidden={areEdgePoresHidden}
						onToggleHideEdgePores={
							pores?.metadata ? handleToggleHideEdgePores : undefined
						}
						onRefreshColors={() => setPoreColorSeed(s => s + 1)}
					/>
				</div>
			)}

			<AddFilesModal
				isOpen={isAddFilesModalOpen}
				onClose={() => setIsAddFilesModalOpen(false)}
				onSubmit={async files => {
					await ingestFiles(files);
					setIsAddFilesModalOpen(false);
				}}
			/>
		</div>
	);
};

// --- Add files modal --------------------------------------------------

interface AddFilesModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (files: File[]) => Promise<void>;
}

const AddFilesModal: React.FC<AddFilesModalProps> = ({
	isOpen,
	onClose,
	onSubmit,
}) => {
	if (!isOpen) return null;
	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-lg shadow-lg max-w-xl w-full"
				onClick={e => e.stopPropagation()}
			>
				<div className="flex justify-between items-center px-6 pt-4">
					<h2 className="text-lg font-semibold text-gray-800">Add files</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
					>
						&times;
					</button>
				</div>
				<p className="px-6 text-xs text-gray-500">
					Accepts <code>.glb</code> / <code>.gltf</code> meshes and{' '}
					<code>.json</code> metadata. Files with "pore" or "particle" in the
					name are auto-routed.
				</p>
				<UploadFile
					acceptedFileTypes={TEST_VIZ_ACCEPTED_TYPES}
					onUploadSubmit={onSubmit}
					uploadButtonLabel="Load files"
				/>
			</div>
		</div>
	);
};

// --- Files panel -------------------------------------------------------

interface FilesPanelProps {
	particles: CategoryData | null;
	pores: CategoryData | null;
	onReassign: (from: CategoryKey, to: CategoryKey) => void;
	onRemove: (category: CategoryKey) => void;
	onAddMore: () => void;
	onClearAll: () => void;
}

const FilesPanel: React.FC<FilesPanelProps> = ({
	particles,
	pores,
	onReassign,
	onRemove,
	onAddMore,
	onClearAll,
}) => {
	return (
		<div className="bg-white bg-opacity-80 shadow-lg rounded-lg p-3 w-64 text-xs">
			<div className="flex justify-between items-center border-b border-gray-300 pb-1 mb-2">
				<h2 className="text-sm font-semibold text-gray-800">Files</h2>
				<button
					className="text-blue-600 hover:text-blue-800"
					onClick={onClearAll}
				>
					Clear all
				</button>
			</div>
			<div className="space-y-2">
				{particles && (
					<FileRow
						slotCategory={0}
						data={particles}
						onReassign={onReassign}
						onRemove={onRemove}
					/>
				)}
				{pores && (
					<FileRow
						slotCategory={1}
						data={pores}
						onReassign={onReassign}
						onRemove={onRemove}
					/>
				)}
			</div>
			<div className="mt-2 pt-2 border-t border-gray-200">
				<button
					className="text-blue-600 hover:text-blue-800 text-xs"
					onClick={onAddMore}
				>
					+ Add more files
				</button>
			</div>
		</div>
	);
};

const FileRow: React.FC<{
	slotCategory: CategoryKey;
	data: CategoryData;
	onReassign: (from: CategoryKey, to: CategoryKey) => void;
	onRemove: (category: CategoryKey) => void;
}> = ({ slotCategory, data, onReassign, onRemove }) => {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between gap-1">
				<span
					className="truncate text-gray-800 flex-1"
					title={data.fileName}
				>
					{data.fileName}
				</span>
				<select
					value={slotCategory}
					onChange={e =>
						onReassign(
							slotCategory,
							parseInt(e.target.value, 10) as CategoryKey
						)
					}
					className="border border-gray-300 rounded px-1 py-0.5 text-xs"
				>
					<option value={0}>Particles</option>
					<option value={1}>Pores</option>
				</select>
				<button
					className="text-gray-500 hover:text-red-600 text-sm px-1"
					title="Remove"
					onClick={() => onRemove(slotCategory)}
				>
					✕
				</button>
			</div>
			{data.metadataFileName && (
				<div
					className="text-gray-500 italic truncate pl-1"
					title={data.metadataFileName}
				>
					meta: {data.metadataFileName}
				</div>
			)}
		</div>
	);
};

export default TestVisualization;
