import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import { useParams } from 'react-router-dom';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'; // Icons for collapse
import UploadFile from '../../app/common/upload-file/upload-file';
import { ACESFilmicToneMapping, PCFSoftShadowMap } from 'three';
import * as THREE from 'three';
import { FaSpinner } from 'react-icons/fa';

const Model = ({ url }: { url: string }) => {
	const { scene } = useGLTF(url);
	const { camera } = useThree();
	const cameraSetRef = useRef(false);

	useEffect(() => {
		if (!scene || cameraSetRef.current) return;

		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3()).length();
		const center = box.getCenter(new THREE.Vector3());

		// Position the model correctly
		scene.position.set(-center.x, -center.y, -center.z);

		//const optimalDistance = Math.max(5, Math.log(size + 1) * 2);
		const optimalDistance = Math.max(2, size * 0.7);

		// Adjust camera position dynamically based on model size
		camera.position.set(optimalDistance, optimalDistance * 0.6, optimalDistance * 1.2);
		// camera.lookAt(center);
		camera.lookAt(new THREE.Vector3(0,0,0));

		camera.near = Math.max(0.1, size / 10);
		camera.far = size * 10;
		camera.updateProjectionMatrix();

		cameraSetRef.current = true;
		// setModelLoaded(true);
				
	}, [camera, scene]);

	return <primitive object={scene} />;
};

const Visualization: React.FC = () => {
	const { domainStore, userStore, scaffoldGroupStore } = useStore();
	const { domainMeshUrl, domainMetadata, isFetchingDomain, uploadDomainMesh, clearDomainMesh } = domainStore;
	const { selectedScaffoldGroup, navigateToVisualization } = scaffoldGroupStore 
	const params = useParams<{ scaffoldId?: string }>();

	const resolvedScaffoldId = params.scaffoldId ? parseInt(params.scaffoldId, 10) : 401;
	const [isPanelOpen, setIsPanelOpen] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isRestoring, setIsRestoring] = useState(false);

	const [category, setCategory] = useState<number | "">(""); // Required
	const [voxelSize, setVoxelSize] = useState<number | null>(null); // Optional
	const [domainSize, setDomainSize] = useState<[number | null, number | null, number | null]>([null, null, null]);
	const [selectedFile, setSelectedFile] = useState<File | null>(null); // Required
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const canEdit = userStore.user?.roles?.includes("administrator") ?? false;

	useEffect(() => {
		if (!isNaN(resolvedScaffoldId)) {
			domainStore.visualizeDomain(resolvedScaffoldId).catch(() => {
				domainStore.domainMesh = null;
			})
		}
	}, [resolvedScaffoldId, domainStore]);

	useEffect(() => {
		if (!selectedScaffoldGroup && !isRestoring) {
			setIsRestoring(true); // Mark restoration as in progress
			scaffoldGroupStore.navigateToVisualization(null, resolvedScaffoldId)
				.finally(() => setIsRestoring(false)); // Ensure UI updates when done
		}
	}, [selectedScaffoldGroup, resolvedScaffoldId, scaffoldGroupStore, isRestoring]);

	useEffect(() => {
		return () => {
			clearDomainMesh(); 
		};
	}, [clearDomainMesh]);

	const handleDomainSizeChange = (index: number, value: string) => {
		const updatedSize: [number | null, number | null, number | null] = [...domainSize];
		updatedSize[index] = value ? parseFloat(value) : null; // Convert to number
		setDomainSize(updatedSize);
	};

	const handleFormSubmit = async (e: React.FormEvent) => {	
		e.preventDefault();

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
		if (files.length === 0) return;
		setSelectedFile(files[0]);
	}

	const handleScaffoldChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const newScaffoldId = parseInt(event.target.value, 10);
		if (newScaffoldId !== resolvedScaffoldId) {
			navigateToVisualization(selectedScaffoldGroup, newScaffoldId);
		}
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
					<Model url={domainMeshUrl} />
				</Bounds>

				<OrbitControls 
					enableDamping={true}
					dampingFactor={0.1}
				/>
			</Canvas>
		);
	}, [domainMeshUrl, isFetchingDomain]); // Only re-renders when the domain mesh changes

	if (!selectedScaffoldGroup || isRestoring) {
		return <p className="text-gray-500">Restoring scaffold group...</p>;
	}

	return (
		<div className="container mx-auto py-8 px-2 justify-center h-screen">
			<div className="w-full h-full rounded-lg">{canvasElement}</div>
			
			{/* Collapsible Info Panel */}
			<div className="absolute mt-9 top-4 right-4 bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 transition-all duration-300">
				{/* Panel Header */}
				<div className={`flex justify-between items-center cursor-pointer ${
					isPanelOpen ? "border-b border-gray-300 pb-2" : "pb-0"
				}`}
					onClick={() => setIsPanelOpen(!isPanelOpen)}
				>
					<h2 className="text-sm font-semibold text-gray-800">Info</h2>
					{isPanelOpen ? <FiChevronUp /> : <FiChevronDown />}
				</div>

				{/* Panel Content */}
				<div 
					className={`overflow-hidden transition-all duration-300 ${
						isPanelOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
					}`}
				>
					<div className="mt-3 text-sm text-gray-700">
						<p><span className="font-semibold">Scaffold Group ID:</span> {selectedScaffoldGroup?.id ?? "Unknown"}</p>
						{/* <p><span className="font-semibold">Scaffold ID:</span> {resolvedScaffoldId}</p> */}

						<div className="mt-2">
							<label className="block text-sm font-semibold text-gray-800">Scaffold ID:</label>
							<select
								className="mt-1 block w-full border bg-opacity-80 border-gray-300 rounded-md p-1 text-gray-700 focus:ring focus:ring-blue-300"
								value={resolvedScaffoldId}
								onChange={handleScaffoldChange}
							>
								{selectedScaffoldGroup?.scaffoldIds.map(id => (
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
										Update Domains
									</button>
								</div>
							</>
						)}
					</div>
				</div>
				{/* {isPanelOpen && (
					
				)} */}

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
		</div>
	);
};

export default observer(Visualization);