import React, { useEffect, useState, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { useParams } from 'react-router-dom';
import History from '../../app/helpers/History';
import useUndoShortcut from '../../app/common/hooks/undo';
import { HistoryAction } from '../../app/models/historyAction';
import CanvasViewer from './canvas-viewer';
import InfoPanel from './info-panel';
import HiddenPanel from './hidden-panel';
import SelectedPanel from './selected-panel';
import * as THREE from 'three';
import UpdateDomainModal from './update-domain-modal';
import { useGLTF } from '@react-three/drei';
import ScreenshotViewer from './screenshot-viewer';
import { ImageCategory, ImageToCreate } from '../../app/models/image';

const Visualization: React.FC = () => {
	const { domainStore, userStore, scaffoldGroupStore, commonStore } = useStore();
	const { domainMeshUrl, domain, domainMetadata, isFetchingDomain, uploadDomainMesh, clearDomainMesh } = domainStore;
	// const [screenshotTargetScaffoldId, setScreenshotTargetScaffoldId] = useState<number | null>(null);
	const params = useParams<{ scaffoldId?: string }>();

	const [hiddenParticles, setHiddenParticles] = useState<Set<string>>(new Set());
	const [selectedParticle, setSelectedParticle] = useState<{ id: string, mesh: THREE.Mesh } | null>(null);
	const [, setHistory] = useState<HistoryAction[]>([]);
	const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
	const [selectedScaffoldId, setSelectedScaffoldId] = useState<number | null>(null);
	const [scaffoldIdForScreenshot, setScaffoldIdForScreenshot] = useState<number | null>(null);

	const [selectedScaffoldGroupId, setSelectedScaffoldGroupId] = useState<number | null>(null);
	const [isPanelOpen, setIsPanelOpen] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showHelp, setShowHelp] = useState(false);
	const [, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const currentlyLoadingScaffoldIdRef = useRef<number | null>(null);
	const maxHistorySize = 10;

	const canEdit = userStore.user?.roles?.includes("administrator") ?? false;
	const resolvedScaffoldId = params.scaffoldId ? parseInt(params.scaffoldId, 10) : null;

	const loadDomainAndGroup = useCallback(async () => {
		const category = selectedCategories[0];
		let scaffoldId = selectedScaffoldId ?? resolvedScaffoldId;
	
		try {
			const actualId = await domainStore.visualizeDomain(scaffoldId, category);
			if (actualId != null) {
				scaffoldId = actualId;
				setSelectedScaffoldId(actualId);
			} else {
				// Mesh not available
				setSelectedScaffoldId(scaffoldId); // Still keep user's choice
				domainStore.clearDomainMesh(); // Clear mesh to show "mesh not generated" properly
			}
		} catch (error) {
			console.error(error);
			return;
		}
		
		if (!scaffoldId) return; // DONT MOVE THIS LINE
		currentlyLoadingScaffoldIdRef.current = scaffoldId;
	
		try {
			const [group,] = await Promise.all([
				scaffoldGroupStore.loadGroupForScaffoldId(scaffoldId),
				domainStore.getDomainMetadata(domain?.id)
			]);

			if (group) {
				setSelectedScaffoldGroupId(group.id);
			}
		} catch (error) {
			console.warn("Failed to load scaffold group", error);
		}
	}, [selectedCategories, selectedScaffoldId, resolvedScaffoldId, domainStore, domain, scaffoldGroupStore]);

	useEffect(() => {
		if (selectedCategories.length === 0) {
			setSelectedCategories([0]);
			return;
		}
	
		loadDomainAndGroup();
	}, [selectedCategories, loadDomainAndGroup]);

	useEffect(() => {
		return () => {
			console.log("Scaffold changed or component unmounted. Clearing mesh.");
			clearDomainMesh();
		};
	}, [clearDomainMesh, resolvedScaffoldId]);

	useEffect(() => {
		if (domainMeshUrl) {
		  useGLTF.preload(domainMeshUrl);
		}
	  }, [domainMeshUrl]);

	const addToHistory = useCallback((action: HistoryAction) => {
		setHistory((prevHistory) => {
			// Check if the last action is the same type and on the same particle
			const lastAction = prevHistory[prevHistory.length - 1];

			if (lastAction && lastAction.type === action.type && lastAction.particleId === action.particleId) {
				// Prevent adding duplicate actions
				return prevHistory;
			}
			const newHistory = [...prevHistory, action];
			if (newHistory.length > maxHistorySize) {
				newHistory.shift(); // FIFO behavior
			}
			return newHistory;
		});
	}, []);
	
	const undoLastAction = () => {
		setHistory((prevHistory) => {
			if (prevHistory.length === 0) return prevHistory; // No actions to undo

			const lastAction = prevHistory[prevHistory.length - 1];

			// Undo logic
			if (lastAction.type === 'SELECT') {
				// Restore previous particle material and unselect it
				const particle = selectedParticle?.mesh;
				// const restoredParticle = lastAction?.previousState.mesh;
				if (particle && lastAction.previousState.material) {
					particle.material = lastAction.previousState.material;
					setSelectedParticle(null);
				}
			} else if (lastAction.type === 'UNSELECT') {
				// Reapply material and select particle again
				if (lastAction.previousState.mesh && lastAction.previousState.material) {
					const restoredParticle = lastAction.previousState.mesh;
					setSelectedParticle({ id: lastAction.particleId, mesh: restoredParticle });
				}
			} else if (lastAction.type === 'SWITCH') {
				if (lastAction.previousState.mesh && lastAction.previousState.material) {
					const restoredParticle = lastAction.previousState.mesh;
					setSelectedParticle({ id: lastAction.particleId, mesh: restoredParticle });
				}
			} else if (lastAction.type === 'HIDE') {
				// Unhide the particle
				setHiddenParticles((prevHidden) => {
					const newSet = new Set(prevHidden);
					newSet.delete(lastAction.particleId);
					return newSet;
				});
			} else if (lastAction.type === 'SHOW') {
				// Hide the particle
				setHiddenParticles((prevHidden) => {
					const newSet = new Set(prevHidden);
					newSet.add(lastAction.particleId);
					return newSet;
				});
			} else if (lastAction.type === 'SHOW_ALL') {
				// Restore the visibility of all hidden particles
				const restoredHiddenParticles = lastAction.previousState.hiddenParticles;
				setHiddenParticles(new Set(restoredHiddenParticles)); // Restore hidden particles
			}
		
			// Remove the last action from history and ensure the history doesn't exceed 10 actions
			const newHistory = prevHistory.slice(0, -1); // Remove last action

			// Limit history to 10 actions
			if (newHistory.length > 10) {
				newHistory.shift(); // Remove the first action if history exceeds 10
			}
	
			return newHistory; 
		});
	};	

	useUndoShortcut(undoLastAction);

	const handleFormSubmit = async (
		e: React.FormEvent,
		payload: {
			category: number;
			voxelSize: number | null;
			domainSize: [number | null, number | null, number | null];
			selectedFile?: File | null;
		}) => {
		e.preventDefault();

		if (selectedScaffoldId === null) {
			return;
		}

        try {
			setIsLoading(true);

			const formattedDomainSize = payload.domainSize.every(value => value !== null) 
				? `[${payload.domainSize.join(",")}]` 
				: undefined; // Convert to string if all values are set
		
			if (payload.selectedFile) {
				await uploadDomainMesh(
					selectedScaffoldId,
					payload.selectedFile,
					payload.category,
					payload.voxelSize || undefined,
					formattedDomainSize || undefined
				);
				setScaffoldIdForScreenshot(selectedScaffoldId);
			}
			
			setIsModalOpen(false); // Close modal after success
        } catch (error) {
            console.error("Upload failed", error);
			setError("Upload failed. Please try again.");
        } finally {
			setIsLoading(false);
		}
    };

	const handleScaffoldChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
		const newScaffoldId = parseInt(event.target.value, 10);
		setSelectedScaffoldId(newScaffoldId);
	
		// Try loading mesh
		const returnedScaffoldId = await domainStore.visualizeDomain(newScaffoldId, selectedCategories[0] ?? 0);
	
		if (returnedScaffoldId != null) {
			// setScreenshotTargetScaffoldId(returnedScaffoldId);
			setSelectedParticle(null);
			setHiddenParticles(new Set());
		}
	};

	const handleToggleHideEdgePores = (hide: boolean) => {
		if (!domain || !domainMetadata) return;
	  
		const newHidden = new Set(hiddenParticles);
	  
		Object.entries(domainMetadata.metadata).forEach(([id, metadata]) => {
		  if (typeof metadata === "object" && metadata && "edge" in metadata && metadata.edge === 1) {
			if (hide) {
			  newHidden.add(id);
			} else {
			  newHidden.delete(id);
			}
		  }
		});
	  
		setHiddenParticles(newHidden);
	};

	const handleParticleClick = useCallback((particleId: string, particle: THREE.Mesh) => {
		if (!particle || !(particle instanceof THREE.Mesh)) {
			console.warn("handleParticleClick: Invalid particle", particle);
			return;
		}

		// Check if there's a previously selected particle to unselect
		const prevState = {
			material: Array.isArray(particle.material)
				? particle.material[0] // Use the first material if it's an array
				: particle.material, // Single material
			visible: particle.visible,
			mesh: particle
		};

		// If the current particle is already selected, unselect it and store the action in history
		if (selectedParticle?.id === particleId) {
			addToHistory({
				type: "UNSELECT",
				particleId,
				previousState: prevState,
			});
			setSelectedParticle(null);
			return;
		} else if (selectedParticle && selectedParticle.id !== particleId) {
			addToHistory({
				type: "SWITCH",
				particleId: selectedParticle.id,
				previousState: {
					material: Array.isArray(selectedParticle.mesh.material)
						? selectedParticle.mesh.material[0] // Use the first material if it's an array
						: selectedParticle.mesh.material, // Single material
					visible: selectedParticle.mesh.visible,
					mesh: selectedParticle.mesh,
				},	
			});

		}
	
		// Apply a glowing, shiny effect to the selected particle
		particle.material = new THREE.MeshStandardMaterial({
			color: "orange", // Orange color
			emissive: new THREE.Color("orange").multiplyScalar(0.5), // Glowing effect
			emissiveIntensity: 10, // Intensity of the glow
			metalness: 0.9, // High metalness
			roughness: 0.1, // Smooth surface for shine
		});
	
		// Store the new selected particle reference and its material state
		setSelectedParticle({ id: particleId, mesh: particle });

		// Add to history (first time selecting a particle)
		addToHistory({
			type: "SELECT",
			particleId,
			previousState: {
				material: particle.userData.originalMaterial,
				visible: particle.visible,
				mesh: particle
			},
		});

	}, [addToHistory, selectedParticle]);

	const handleParticleRightClick = (particleId: string, particle: THREE.Mesh) => {
		if (!(particle instanceof THREE.Mesh)) return;

		// Save the previous state (material and visibility) for history
		const prevState = {
			material: Array.isArray(particle.material)
				? particle.material[0] // Use the first material if it's an array
				: particle.material, // Single material
			visible: particle.visible,
		};
	
		setHiddenParticles((prevHidden) => {
			const newSet = new Set(prevHidden);

			if (newSet.has(particleId)) {
				newSet.delete(particleId); // Unhide the particle if it's already hidden
				particle.visible = true; // Make it visible again
			} else {
				newSet.add(particleId); // Hide the particle
				particle.visible = false; // Make the particle invisible
			}
	
			// Optionally, set raycast to null if needed, but not necessary in most cases
			particle.raycast = particle.visible ? THREE.Mesh.prototype.raycast : () => {};
	
			return newSet;
		});

		setHistory((prevHistory) => {
			// We check the last history action to avoid adding duplicate actions
			const lastAction = prevHistory[prevHistory.length - 1];
	
			if (
				lastAction?.type === "SHOW" &&
				lastAction.particleId === particleId &&
				particle.visible
			) {
				// If last action is "SHOW" and the particle is visible, do nothing (skip duplicate)
				return prevHistory;
			}
	
			if (
				lastAction?.type === "HIDE" &&
				lastAction.particleId === particleId &&
				!particle.visible
			) {
				// If last action is "HIDE" and the particle is hidden, do nothing (skip duplicate)
				return prevHistory;
			}
	
			// Add the correct action to the history
			const actionType = particle.visible ? "SHOW" : "HIDE";
			return [
				...prevHistory,
				{
					type: actionType,
					particleId,
					previousState: prevState,
				},
			];
		});

	};

	const handleScreenshotUpload = async (blob: Blob) => {
		if (!selectedScaffoldGroupId) return;

		try {
			const image: ImageToCreate = {
				scaffoldGroupId: selectedScaffoldGroupId, // replace with real group ID if needed
				scaffoldId: selectedScaffoldId,
				file: new File([blob], `scaffold-${selectedScaffoldId}.png`, { type: "image/png" }),
				category: ImageCategory.Particles,
			};

			await scaffoldGroupStore.uploadImageForScaffoldGroup(selectedScaffoldGroupId, image);
			console.log("Thumbnail uploaded!");
		} catch (err) {
			console.error("Thumbnail upload failed", err);
		} finally {
			setScaffoldIdForScreenshot(null);
		}
	}

	if (isFetchingDomain) {
		return <p className="text-gray-500">Loading...</p>;
	}

	return (
		<div className="relative w-full h-screen overflow-hidden mt-8 ml-2">
			{showHelp && (
				<div className={`absolute top-10 ${commonStore.isSidebarOpen ? 'left-48' : 'left-2'} z-30 max-w-sm px-4 py-3
					bg-blue-50 border border-blue-300 text-blue-600 rounded-lg shadow-lg 
					transition duration-300 ease-in-out`}
				>
					<button
						onClick={() => setShowHelp(false)}
						className="absolute top-1 right-2 text-blue-600 hover:text-blue-800 text-lg font-bold focus:outline-none"
						aria-label="Close help"
					>
					&times;
					</button>
					<p className="font-semibold mb-2">Instructions:</p>
					<ul className="list-disc list-inside space-y-1 text-sm">
						<li>Click and drag to rotate</li>
						<li>Scroll to zoom in and out</li>
						<li>Left click to select geometry</li>
						<li>Right click to hide geometry</li>
						<li>Cmd+Z or Ctrl+Z to undo</li>
					</ul>
				</div>
			)}
			<div className="w-full h-full rounded-lg">
				{scaffoldIdForScreenshot ? (
					<p className="text-gray-500">Generating thumbnail and loading mesh...</p>
				) : domainMeshUrl ? (
					<div className="w-full h-full rounded-lg relative z-0">
						<CanvasViewer
							domainMeshUrl={domainMeshUrl}
							hiddenParticles={hiddenParticles}
							selectedParticle={selectedParticle}
							onParticleClick={handleParticleClick}
							onParticleRightClick={handleParticleRightClick}
							setHistory={setHistory}
						/>
					</div>
				) : (
					<p className="text-gray-500">The mesh for this scaffold has not been generated yet</p>
				)}
			</div>

			<div className="absolute top-0 right-0 z-20 space-y-1 mr-2">
				<div className="mt-4 flex w-full">
					<button className="button-primary items-center content-center w-full" onClick={() => History.push('/explore')}>
						Explore More
					</button>
				</div>
				<div className="flex w-full text-sm bg-opacity-80">
					<button
						className="text-blue-600 hover:text-blue-800 text-xs"
						onClick={() => {setShowHelp(!showHelp)}}
					>
						Help?
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
					domain={domain}
					onToggleHideEdgePores={handleToggleHideEdgePores}
					canEdit={canEdit}
					onEditClick={() => setIsModalOpen(true)}
					isLoading={scaffoldGroupStore.isFetchingScaffoldGroup}
				/>
				<HiddenPanel
					hiddenParticles={hiddenParticles}
					onShowAll={() => setHiddenParticles(new Set())}
					onToggleVisibility={(id) => {
						setHiddenParticles((prev) => {
						const newSet = new Set(prev);
						newSet.has(id) ? newSet.delete(id) : newSet.add(id);
						return newSet;
						});
					}}
				/>

				{selectedParticle && (
					<SelectedPanel
						selectedDomainEntity={selectedParticle}
						domainCategory={selectedCategories[0]}
						onUnselect={() => setSelectedParticle(null)}
						domainMetadata={domainMetadata}
						scaffoldGroup={scaffoldGroupStore.selectedScaffoldGroup}
					/>
				)}
			</div>

			<UpdateDomainModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onFormSubmit={handleFormSubmit}
				domain={domain}
				isLoading={isLoading}
			/>

			{domainMeshUrl && scaffoldIdForScreenshot && selectedScaffoldGroupId && (
				<div style={{ opacity: 0, position: "absolute", width: 512, height: 512, pointerEvents: "none" }}>
					<ScreenshotViewer
						scaffoldId={scaffoldIdForScreenshot}
						onScreenshotReady={handleScreenshotUpload}
					/>
				</div>
			)}
		</div>
	);
};

export default observer(Visualization);