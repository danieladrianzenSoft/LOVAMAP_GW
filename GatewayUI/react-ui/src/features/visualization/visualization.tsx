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
			clearDomainMesh();  // ✅ Cleanup when unmounting
		};
	}, [clearDomainMesh]);

	const handleUploadSubmit = async (files: File[]) => {
        if (files.length === 0) return;
		
        try {
            await uploadDomainMesh(resolvedScaffoldId, files[0]); // Upload the first file
            setIsModalOpen(false); // Close modal after success
        } catch (error) {
            console.error("Upload failed", error);
        }
    };

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
					toneMappingExposure: 1.2 ,
					shadowMapType: PCFSoftShadowMap
				}}
			>
				<color attach="background" args={["white"]} />
				<ambientLight intensity={0.4} />
				<directionalLight 
					castShadow
					position={[5, 5, 5]} 
					intensity={3} 
				/>
				{/* <directionalLight 
					castShadow 
					position={[-5, 5, 5]} 
					intensity={1} 
				/> */}
				<spotLight 
					position={[0, 15, 10]} 
					angle={0.3} 
					penumbra={1} 
					intensity={2.5} 
					castShadow 
				/>
				<Environment preset="city" background={false} />

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

							{/* UploadFile Component */}
							<UploadFile
								acceptedFileTypes={{ "model/gltf-binary": [".glb"] }}
								onUploadSubmit={handleUploadSubmit}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default observer(Visualization);