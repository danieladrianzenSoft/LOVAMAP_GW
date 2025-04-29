import React, { useEffect, useRef } from 'react';
import { useThree, ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from 'three';
import { observer } from 'mobx-react-lite';
import { HistoryAction } from '../../app/models/historyAction';

interface ModelProps {
	url: string;
	onLoad?: () => void;
	onParticleClick?: (particleId: string, particle: THREE.Mesh) => void;
	onParticleRightClick?: (particleId: string, particle: THREE.Mesh) => void;
	selectedParticle: ({ id: string, mesh: THREE.Mesh } | null);
	hiddenParticles: Set<string>;
	setHistory: React.Dispatch<React.SetStateAction<HistoryAction[]>>;
}

// const Model: React.FC<ModelProps> = ({
// 	url,
// 	onParticleClick,
// 	onParticleRightClick,
// 	hiddenParticles,
// 	selectedParticle,
//   }) => {
// 	const { scene } = useGLTF(url);
// 	const { camera, gl } = useThree();
// 	const cameraSetRef = useRef(false);
  
// 	const modelRef = useRef<THREE.Group>(null);
  
// 	useEffect(() => {
// 	  if (!scene || cameraSetRef.current) return;
  
// 	  const checkAndSetCamera = () => {
// 		if (!modelRef.current) return;
  
// 		const box = new THREE.Box3().setFromObject(modelRef.current);
// 		const size = box.getSize(new THREE.Vector3()).length();
// 		const center = box.getCenter(new THREE.Vector3());
  
// 		modelRef.current.position.set(-center.x, -center.y, -center.z);
  
// 		const optimalDistance = Math.max(2, size * 0.7);
  
// 		camera.position.set(optimalDistance, optimalDistance * 0.6, optimalDistance * 1.2);
// 		camera.lookAt(new THREE.Vector3(0, 0, 0));
// 		camera.near = Math.max(0.1, size / 10);
// 		camera.far = size * 10;
// 		camera.updateProjectionMatrix();
  
// 		cameraSetRef.current = true;
// 	  };
  
// 	  // 👇 wait until *after* first frame
// 	  const cleanup = gl.setAnimationLoop(() => {
// 		checkAndSetCamera();
// 		gl.setAnimationLoop(null); // only run once
// 	  });
  
// 	  return () => gl.setAnimationLoop(null); // clean up just in case
// 	}, [camera, scene, gl]);
  
// 	// Material and visibility logic (no change)
// 	useEffect(() => {
// 	  scene.traverse((child) => {
// 		if (child instanceof THREE.Mesh) {
// 		  child.userData.particleId = child.name;
  
// 		  if (child.userData.particleId === selectedParticle?.id) {
// 			child.material = new THREE.MeshStandardMaterial({ color: "red", emissive: "yellow" });
// 		  } else if (child.userData.originalMaterial) {
// 			child.material = child.userData.originalMaterial;
// 		  }
  
// 		  if (!child.userData.originalMaterial) {
// 			child.userData.originalMaterial = Array.isArray(child.material)
// 			  ? [...child.material]
// 			  : child.material;
// 		  }
  
// 		  if (!child.userData.originalRaycast) {
// 			child.userData.originalRaycast = child.raycast;
// 		  }
  
// 		  if (hiddenParticles.has(child.userData.particleId)) {
// 			child.visible = false;
// 			child.raycast = () => {};
// 		  } else {
// 			child.visible = true;
// 			child.raycast = child.userData.originalRaycast;
// 		  }
// 		}
// 	  });
// 	}, [scene, hiddenParticles, selectedParticle]);
  
// 	return (
// 	  <primitive
// 		object={scene}
// 		ref={modelRef}
// 		onClick={(e: ThreeEvent<PointerEvent>) => {
// 		  e.stopPropagation();
// 		  const particle = e.object as THREE.Mesh;
// 		  if (!particle.userData.particleId) return;
// 		  onParticleClick?.(particle.userData.particleId, particle);
// 		}}
// 		onContextMenu={(e: ThreeEvent<PointerEvent>) => {
// 		  e.stopPropagation();
// 		  e.nativeEvent.preventDefault();
// 		  const particle = e.object as THREE.Mesh;
// 		  if (!particle.userData.particleId) return;
// 		  onParticleRightClick?.(particle.userData.particleId, particle);
// 		}}
// 	  />
// 	);
//   };

// export default observer(Model);

const Model: React.FC<ModelProps> = ({url, onLoad, onParticleClick, onParticleRightClick, hiddenParticles, selectedParticle }) => {
	const { scene } = useGLTF(url);
	// const { scene } = useGLTF(;
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
		onLoad?.();				
	}, [camera, scene, onLoad]);

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


	useEffect(() => {
		return () => {
			scene.traverse((child) => {
				if ((child as THREE.Mesh).geometry) {
					(child as THREE.Mesh).geometry.dispose();
				}
				if ((child as THREE.Mesh).material) {
					const material = (child as THREE.Mesh).material;
					if (Array.isArray(material)) {
						material.forEach((m) => m.dispose());
					} else {
						material.dispose();
					}
				}
			});
		};
	}, [scene]);

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