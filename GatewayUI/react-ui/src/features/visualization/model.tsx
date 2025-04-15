import React, { useEffect, useRef } from 'react';
import { useThree, ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from 'three';
import { observer } from 'mobx-react-lite';
import { HistoryAction } from '../../app/models/historyAction';

interface ModelProps {
	url: string;
	onParticleClick?: (particleId: string, particle: THREE.Mesh) => void;
	onParticleRightClick?: (particleId: string, particle: THREE.Mesh) => void;
	selectedParticle: ({ id: string, mesh: THREE.Mesh } | null);
	hiddenParticles: Set<string>;
	setHistory: React.Dispatch<React.SetStateAction<HistoryAction[]>>;
}

const Model: React.FC<ModelProps> = ({url, onParticleClick, onParticleRightClick, hiddenParticles, selectedParticle }) => {
	const { scene } = useGLTF(url);
	const { camera } = useThree();
	const cameraSetRef = useRef(false);

	useEffect(() => {
		if (!scene || cameraSetRef.current) return;

		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3())?.length();
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

	useEffect(() => {
		scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.userData.particleId = child.name;

				if (child.userData.particleId === selectedParticle?.id) {
					// Highlight the selected particle
					child.material = new THREE.MeshStandardMaterial({ color: "red", emissive: "yellow" });
				  } else {
					// Reset the material for non-selected particles
					if (child.userData.originalMaterial) {
					  child.material = child.userData.originalMaterial;
					}
				  }
	
				// Store original material (if not already stored)
				if (!child.userData.originalMaterial) {
					child.userData.originalMaterial = Array.isArray(child.material)
						? [...child.material] // Store multi-material
						: child.material;
				}
	
				// Store original raycast function (to restore later)
				if (!child.userData.originalRaycast) {
					child.userData.originalRaycast = child.raycast;
				}
	
				if (hiddenParticles.has(child.userData.particleId)) {
					child.visible = false; 
					child.raycast = () => {}; // Disable interactions
				} else {
					child.visible = true;
					child.raycast = child.userData.originalRaycast; // Restore interactivity
				}
			}
		});
	}, [scene, hiddenParticles, selectedParticle]);

	const handleClick = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		const particle = event.object as THREE.Mesh;
		if (!particle || !particle.userData.particleId) return;

		onParticleClick?.(particle.userData.particleId, particle);
	};

	const handleRightClick = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		event.nativeEvent.preventDefault();

		const particle = event.object as THREE.Mesh;
		if (!particle || !particle.userData.particleId) return;

		onParticleRightClick?.(particle.userData.particleId, particle);
	};

	return <primitive object={scene} onClick={handleClick} onContextMenu={handleRightClick} />;
};

export default observer(Model);