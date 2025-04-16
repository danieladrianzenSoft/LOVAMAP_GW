import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls } from "@react-three/drei";
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { useParams } from 'react-router-dom';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'; // Icons for collapse
import UploadFile from '../../app/common/upload-file/upload-file';
import { ACESFilmicToneMapping, PCFSoftShadowMap } from 'three';
import * as THREE from 'three';
import { FaSpinner } from 'react-icons/fa';
import History from '../../app/helpers/History';
import useUndoShortcut from '../../app/common/hooks/undo';
import Tag from '../../app/common/tag/tag';
import Model from './model';
import { HistoryAction } from '../../app/models/historyAction';

const Visualization: React.FC = () => {
	const { domainStore, userStore, scaffoldGroupStore } = useStore();
	const { domainMeshUrl, domainMetadata, isFetchingDomain, uploadDomainMesh, clearDomainMesh } = domainStore;
	const { navigateToVisualization } = scaffoldGroupStore 
	const params = useParams<{ scaffoldId?: string }>();

	const [hiddenParticles, setHiddenParticles] = useState<Set<string>>(new Set());
    // const [selectedParticle, setSelectedParticle] = useState<string | null>(null);
	const [selectedParticle, setSelectedParticle] = useState<{ id: string, mesh: THREE.Mesh } | null>(null);
	// History to track actions for undo
	const [, setHistory] = useState<HistoryAction[]>([]);
	const maxHistorySize = 10;
	
	const [isPanelOpen, setIsPanelOpen] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	// const [isRestoring, setIsRestoring] = useState(false);

	const [category, setCategory] = useState<number | "">(""); // Required
	const [voxelSize, setVoxelSize] = useState<number | null>(null); // Optional
	const [domainSize, setDomainSize] = useState<[number | null, number | null, number | null]>([null, null, null]);
	const [selectedFile, setSelectedFile] = useState<File | null>(null); // Required
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [lastScaffoldId, setLastScaffoldId] = useState<number | null>(null);
	const currentlyLoadingScaffoldIdRef = useRef<number | null>(null);


	// const lastResolvedScaffoldIdRef = useRef<number | null>(null);

	const canEdit = userStore.user?.roles?.includes("administrator") ?? false;

	// const scaffoldIdFromUrl = resolvedScaffoldId ?? -1;
	const resolvedScaffoldId = params.scaffoldId ? parseInt(params.scaffoldId, 10) : null;


	useEffect(() => {
		domainStore.visualizeDomain(resolvedScaffoldId).then((actualScaffoldId) => {
			if (actualScaffoldId != null) {
				setLastScaffoldId(actualScaffoldId);
			}
		});
	}, [resolvedScaffoldId, domainStore]);

	// const selectedGroup = scaffoldGroupStore.selectedScaffoldGroup;

	useEffect(() => {
		if (
			domainMetadata?.scaffoldId != null &&
			domainMetadata.scaffoldId === lastScaffoldId
		) {
			currentlyLoadingScaffoldIdRef.current = domainMetadata.scaffoldId;
	
			const scaffoldIdToLoad = domainMetadata.scaffoldId; // 👈 fix here
	
			(async () => {
				const group = await scaffoldGroupStore.loadGroupForScaffoldId(scaffoldIdToLoad);
	
				if (group && currentlyLoadingScaffoldIdRef.current === scaffoldIdToLoad) {
					scaffoldGroupStore.setSelectedScaffoldGroup(group);
				} else {
					console.warn("⚠️ Outdated scaffold group ignored for", scaffoldIdToLoad);
				}
			})();
		}
	}, [domainMetadata?.scaffoldId, lastScaffoldId, scaffoldGroupStore]);

	useEffect(() => {
		return () => {
			clearDomainMesh(); 
		};
	}, [clearDomainMesh]);

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

	const handleDomainSizeChange = (index: number, value: string) => {
		const updatedSize: [number | null, number | null, number | null] = [...domainSize];
		updatedSize[index] = value ? parseFloat(value) : null; // Convert to number
		setDomainSize(updatedSize);
	};

	const handleFormSubmit = async (e: React.FormEvent) => {	
		e.preventDefault();

		if (resolvedScaffoldId === null) {
			return;
		}

        try {
			if (category === "" || !selectedFile) {
				alert("Please select a category and upload a mesh file.");
				return;
			}

			setIsLoading(true);
			setError(null);

			const formattedDomainSize = domainSize.every(value => value !== null) 
				? `[${domainSize.join(",")}]` 
				: undefined; // Convert to string if all values are set
			
			await uploadDomainMesh(resolvedScaffoldId, selectedFile, category, voxelSize || undefined, formattedDomainSize || undefined); // Upload the first file
			setIsModalOpen(false); // Close modal after success
        } catch (error) {
            console.error("Upload failed", error);
			setError("Upload failed. Please try again.");
        } finally {
			setIsLoading(false);
		}
    };

	const handleUploadSubmit = async (files: File[]) => {
		if (files?.length === 0) return;
		setSelectedFile(files[0]);
	}

	const handleScaffoldChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
		const newScaffoldId = parseInt(event.target.value, 10);
		if (newScaffoldId !== resolvedScaffoldId) {
			navigateToVisualization(scaffoldGroupStore.selectedScaffoldGroup, newScaffoldId);
			// await scaffoldGroupStore.getScaffoldGroupSummaryByScaffoldId(newScaffoldId);
			setSelectedParticle(null);
			setHiddenParticles(new Set())
		}
	};

	// const handleParticleClick = (particleId: string, particle: THREE.Mesh) => {
	// 	if (!particle || !(particle instanceof THREE.Mesh)) {
	// 		console.warn("handleParticleClick: Invalid particle", particle);
	// 		return;
	// 	}
		
	// 	setSelectedParticle((prevSelected) => {
	// 		if (prevSelected?.id === particleId) {
	// 			return null; // Unselect if already selected
	// 		}
	// 		setSelectedParticleMesh(particle); // Store the mesh
	// 		return {
	// 			id: particleId,
	// 			mesh: particle // Make sure mesh is correctly set
	// 		};
	// 	});
	// };
	const resetParticleSelection = () => {
		if (selectedParticle == null) return;

		// Store the current selection as a SELECT action before unselecting it
		addToHistory({
			type: "SELECT", // We store it as a SELECT action for undo
			particleId: selectedParticle.id,
			previousState: {
				material: Array.isArray(selectedParticle.mesh.material)
					? selectedParticle.mesh.material[0] // Use the first material if it's an array
					: selectedParticle.mesh.material, // Single material
				visible: selectedParticle.mesh.visible,
			},
		});
		addToHistory({
			type: "UNSELECT",
			particleId: selectedParticle.id,
			previousState: {
				material: selectedParticle?.mesh?.userData.originalMaterial || selectedParticle?.mesh?.material,
				visible: selectedParticle?.mesh?.visible,
			},
		});

		setSelectedParticle(null);
	}

	const showAllParticles = () => {
		const hiddenParticlesArray = Array.from(hiddenParticles);
	  
		// Store the SHOW_ALL action in history
		setHistory((prevHistory) => [
		  ...prevHistory,
		  {
			type: 'SHOW_ALL',
			particleId: '',  // `SHOW_ALL` doesn't need a specific particleId
			previousState: {
			  hiddenParticles: hiddenParticlesArray,
			},
		  },
		]);
	  
		// Clear the hidden particles to show all particles
		setHiddenParticles(new Set());
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
	
		// // Restore the previous particle if it exists
		// if (selectedParticle?.mesh && selectedParticle.mesh.userData.originalMaterial) {
		// 	selectedParticle.mesh.material = selectedParticle.mesh.userData.originalMaterial;
		// }
	
		// // Store the original material before selecting the new particle
		// if (!particle.userData.originalMaterial) {
		// 	particle.userData.originalMaterial = particle.material;
		// }
	
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
	
	const handleToggleVisibility = (particleId: string) => {
		setHiddenParticles((prevHidden) => {
			const newSet = new Set(prevHidden);
			if (newSet.has(particleId)) {
				newSet.delete(particleId); // Unhide particle
			} else {
				newSet.add(particleId); // Hide particle
			}
			return newSet;
		});
	};

	const canvasElement = useMemo(() => {
		if (isFetchingDomain) {
			return <p className="text-gray-500">Loading...</p>;
		}

		if (!domainMeshUrl) {
			return <p className="text-gray-500">The mesh for this scaffold has not been generated yet</p>;
		}

		return (
			<Canvas
				key={domainMeshUrl}
				shadows
				gl={{ 
					toneMapping: ACESFilmicToneMapping, 
					toneMappingExposure: 1.2,
					shadowMapType: PCFSoftShadowMap
				}}
			>
				<color attach="background" args={["white"]} />
				<ambientLight intensity={0.2} />
				<directionalLight 
					castShadow
					position={[5, 5, 5]} 
					intensity={0.2} 
				/>
				{/* <directionalLight 
					castShadow 
					position={[-5, 5, 5]} 
					intensity={1} 
				/> */}
				<spotLight 
					position={[0, 15, 10]} 
					angle={0.3} 
					penumbra={0.8} 
					intensity={0.8} 
					castShadow 
				/>
				<Environment preset="lobby" background={false} />

				{/* Automatically centers and scales the mesh */}
				<Bounds>
					<Model 
						url={domainMeshUrl} 
						onParticleClick={handleParticleClick} 
						onParticleRightClick={handleParticleRightClick}
						hiddenParticles={hiddenParticles}
						selectedParticle={selectedParticle}
						setHistory={setHistory}
					/>
				</Bounds>
				{/* <EffectComposer>
					<Outline
						selection={selectedParticle ? [selectedParticle.mesh] : undefined}// Selected particle
						edgeStrength={5} 
						blendFunction={BlendFunction.SCREEN} 
						visibleEdgeColor={new THREE.Color("yellow").getHex()} 
						hiddenEdgeColor={new THREE.Color("black").getHex()}
					/>
				</EffectComposer> */}
				{/* {(selectedParticleMesh) && (
					<EffectComposer>
						<Bloom
							intensity={1.5}
							luminanceThreshold={0.1}
							luminanceSmoothing={0.9}
							blendFunction={BlendFunction.SCREEN}
							visibleEdgeColor={new THREE.Color("yellow").getHex()}
							hiddenEdgeColor={new THREE.Color("black").getHex()}
							selection={[selectedParticleMesh || createEmptyMesh()]}
						/>
					</EffectComposer>
				)} */}

				<OrbitControls 
					enableDamping={true}
					dampingFactor={0.1}
				/>
			</Canvas>
		);
	}, [isFetchingDomain, domainMeshUrl, handleParticleClick, hiddenParticles, selectedParticle]); // Only re-renders when the domain mesh changes

	if (!scaffoldGroupStore.selectedScaffoldGroup) {
		return <p className="text-gray-500">Restoring scaffold group...</p>;
	}

	return (
		<div className="container mx-auto py-8 px-2 justify-center h-screen">
			<div className="w-full h-full rounded-lg">{canvasElement}</div>
			<div className="absolute mt-9 top-4 right-4">

				{/* Explore More Button */}
				<div className="mt-4 flex w-full">
					<button 
						className={`button-primary items-center content-center w-full}`}
						onClick={() => { History.push('/explore') }}
					>
						Explore More
					</button>
				</div>

				{/* Collapsible Info Panel */}
				<div className="bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64">
					{/* Panel Header */}
					<div className={`flex justify-between items-center cursor-pointer transition-all duration-300 ${
						isPanelOpen ? "border-b border-gray-300 pb-2" : "pb-0"
					}`}
						onClick={() => setIsPanelOpen(!isPanelOpen)}
					>
						<h2 className="text-sm font-semibold text-gray-800">Scaffold Info</h2>
						{isPanelOpen ? <FiChevronUp /> : <FiChevronDown />}
					</div>

					{/* Info Panel Content */}
					<div 
						className={`overflow-hidden ${
							isPanelOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
						}`}
					>
						<div className="mt-3 text-sm text-gray-700">
							{/* <p><span className="font-semibold">Scaffold ID:</span> {resolvedScaffoldId}</p> */}

							<div className="flex flex-wrap gap-y-1 mb-2">
								{scaffoldGroupStore.selectedScaffoldGroup.tags.map((tag, index) => (
									<Tag key={index} text={tag} />
								))}
							</div>

							<p className='mt-2'><span className="font-semibold">Name:</span> {scaffoldGroupStore.selectedScaffoldGroup?.name ?? "Unknown"}</p>

							<p className='mt-2'><span className="font-semibold">ID:</span> {scaffoldGroupStore.selectedScaffoldGroup?.id ?? "Unknown"}</p>
							
							<p className='mt-2'><span className="font-semibold">Simulated:</span> {scaffoldGroupStore.selectedScaffoldGroup.isSimulated ? 'Yes' : 'No'}</p>

							<p className='mt-2'><span className="font-semibold">Packing:</span> {scaffoldGroupStore.selectedScaffoldGroup.inputs?.packingConfiguration ?? "Unknown"}</p>

							<div className="mt-2">
								<label className="block text-sm font-semibold text-gray-800">Replicate ID:</label>
								<select
									className="mt-1 block w-full border bg-opacity-80 border-gray-300 rounded-md p-1 text-gray-700 focus:ring focus:ring-blue-300"
									value={domainMetadata?.scaffoldId ?? ''}
									onChange={handleScaffoldChange}
								>
									{scaffoldGroupStore.selectedScaffoldGroup?.scaffoldIds.map(id => (
										<option key={id} value={id}>{id}</option>
									))}
								</select>
							</div>

							<p className='mt-2'><span className="font-semibold">Voxel Size:</span> {domainMetadata?.voxelSize ?? "Unknown"}</p>

							{canEdit && (
								<>
									<div className="mt-4">
										<button 
											className="button-outline self-start flex items-center gap-2"
											onClick={() => setIsModalOpen(true)}
										>
											Update
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
				{/* Hidden Particles Panel */}
				{hiddenParticles.size > 0 ? (
					<div className="mt-2 bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 transition-all duration-300">
						<div className="flex justify-between items-center cursor-pointer border-b border-gray-300 pb-2">
							<h2 className="text-sm font-semibold text-gray-800">Hidden</h2>
							<button
								className="text-blue-600 hover:text-blue-800 text-xs"
								onClick={() => showAllParticles()}
							>
								Show all
							</button>
						</div>

						<div className="mt-2 text-sm text-gray-700 max-h-40 overflow-y-auto">
							<ul className="mt-2 space-y-1">
								{Array.from(hiddenParticles).map((particleId) => (
									<li key={particleId} className="flex justify-between items-center">
										<span>{particleId}</span>
										<button
											className="text-blue-600 hover:text-blue-800 text-xs"
											onClick={() => handleToggleVisibility(particleId)}
										>
											Show
										</button>
									</li>
								))}
							</ul>
						</div>
					</div>
				) : 
				(
					<div></div>
				)}
				{/* Selected Entity Panel */}
				{selectedParticle ? (
					<div className="mt-2 bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 transition-all duration-300">
						<div className="flex justify-between items-center cursor-pointer border-b border-gray-300 pb-2">
							<h2 className="text-sm font-semibold text-gray-800">Selected</h2>
							<button
								className="text-blue-600 hover:text-blue-800 text-xs"
								onClick={() => resetParticleSelection()}
							>
								Unselect
							</button>
						</div>

						<div className="mt-2 text-sm text-gray-700 max-h-40 overflow-y-auto">
							<div className="mt-3 text-sm text-gray-700">
								<p><span className="font-semibold">ID:</span> {selectedParticle.id}</p>
							</div>
						</div>
					</div>
				) : 
				(
					<div></div>
				)}
				
			</div>
			{/* Upload Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-bold">Upload .GLB File</h2>
							<button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 cursor-pointer">
								&times;
							</button>
						</div>

						{/* <UploadFile
							acceptedFileTypes={{ "model/gltf-binary": [".glb"] }}
							onUploadSubmit={handleUploadSubmit}
						/> */}
						<form onSubmit={handleFormSubmit} className="space-y-4">
							{/* Category Dropdown */}
							<div>
								<label className="block text-sm font-medium text-gray-700">Category *</label>
								<select 
									value={category}
									onChange={(e) => setCategory(Number(e.target.value))}
									className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
									required
								>
									<option value="">Select Category</option>
									<option value="0">Particle</option>
									<option value="1">Pore</option>
									<option value="2">Other</option>
								</select>
							</div>

							{/* Voxel Size (Optional) */}
							<div>
								<label className="block text-sm font-medium text-gray-700">Voxel Size</label>
								<input 
									type="number" 
									step="any"
									placeholder="Enter voxel size (optional)"
									value={voxelSize ?? undefined}
									onChange={(e) => setVoxelSize(e.target.value ? parseFloat(e.target.value) : null)}
									className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
								/>
							</div>

							{/* Domain Size (Optional) */}
							<div>
								<label className="block text-sm font-medium text-gray-700">Domain Size (X, Y, Z)</label>
								<div className="flex space-x-2">
									<input 
										type="number"
										step="any"
										placeholder="X"
										value={domainSize[0] ?? ""}
										onChange={(e) => handleDomainSizeChange(0, e.target.value)}
										className="w-1/3 p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
									/>
									<input 
										type="number"
										step="any"
										placeholder="Y"
										value={domainSize[1] ?? ""}
										onChange={(e) => handleDomainSizeChange(1, e.target.value)}
										className="w-1/3 p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
									/>
									<input 
										type="number"
										step="any"
										placeholder="Z"
										value={domainSize[2] ?? ""}
										onChange={(e) => handleDomainSizeChange(2, e.target.value)}
										className="w-1/3 p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
									/>
								</div>
							</div>

							{/* UploadFile Component (Required) */}
							<div>
								<label className="block text-sm font-medium text-gray-700">Mesh File *</label>
								<UploadFile 
									acceptedFileTypes={{ "model/gltf-binary": [".glb"] }} 
									onUploadSubmit={handleUploadSubmit}

								/>
								{selectedFile && (
									<p className="text-sm text-gray-600 mt-1">
										✔ File selected: {selectedFile.name}
									</p>
								)}
							</div>

							{/* Submit Button */}
							<button 
								type="submit" 
								className={`w-full py-2 rounded-md transition ${
									isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
								}`}
							>
								{isLoading ? (
									<>
										<FaSpinner className="animate-spin mr-2 inline" /> Uploading...
									</>
								) : (
									"Upload Mesh"
								)}
							</button>
							{error && <p className="text-red-500 text-sm mt-2">{error}</p>}
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default observer(Visualization);