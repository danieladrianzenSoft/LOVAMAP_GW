import React, { useEffect, useRef } from 'react';
import { useThree, ThreeEvent, Vector3 } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from 'three';
import { observer } from 'mobx-react-lite';

interface ModelProps {
	url: string;
	category: number;
	visible: boolean;
	hiddenIds: Set<string>;
	selectedEntity: ({ id: string, mesh: THREE.Mesh } | null);
  	combinedCenter?: THREE.Vector3;

	// Interactivity
	onLoad?: (
		loadedScene: THREE.Object3D, 
		center: THREE.Vector3, 
		size: number, 
		category: number,
		bounds: { min: THREE.Vector3; max: THREE.Vector3 }
	) => void;
	onEntityClick?: (category: number, id: string, mesh: THREE.Mesh) => void;
	onEntityRightClick?: (category: number, id: string, mesh: THREE.Mesh) => void;
	
	// Visual controls
	opacity?: number;                     // Independent opacity control
	color?: string;                       // Independent base color (optional)
	dimmed?: boolean;                     // Whether to apply dimming override
	dimmedOptions?: {
		color?: string;                   // Default: '#f2f3f4'
		opacity?: number;                // Default: 0.1
	};
	debugMode?: boolean;
	slicingActive?: boolean;
  	sliceXThreshold?: number | null;
	theme?: 'Metallic' | 'Sunset';
}

function createBoundingBoxHelper(object: THREE.Object3D, color: string): THREE.BoxHelper {
	const boxHelper = new THREE.BoxHelper(object, color);
	boxHelper.name = 'BoundingBoxHelper';
	return boxHelper;
}

const Model: React.FC<ModelProps> = ({
	url, 
	category, 
	visible,
	onLoad, 
	hiddenIds, 
	selectedEntity, 
	combinedCenter,
	onEntityClick, 
	onEntityRightClick, 
	color, 
	opacity, 
	dimmed, 
	dimmedOptions, 
	debugMode,
	slicingActive,
  	sliceXThreshold,
	theme
}) => {
	const { scene } = useGLTF(url);
	const { camera } = useThree();
	const cameraSetRef = useRef(false);

	const shouldSlice = slicingActive && typeof sliceXThreshold === 'number';

	useEffect(() => {
		if (!scene || cameraSetRef.current) return;

		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3())?.length();
		const center = box.getCenter(new THREE.Vector3());

		const min = box.min.clone();
  		const max = box.max.clone();

		// scene.position.set(-center.x, -center.y, -center.z);

		if (debugMode) {
			// Determine color based on category (0 = particles, 1 = pores)
			const bboxColor = category === 0 ? 'red' : 'blue';

			// Remove existing bounding box helpers (if any) before adding new
			scene.traverse((child) => {
				if (child.name === 'BoundingBoxHelper') {
					scene.remove(child);
				}
			});

			// Create and add the bounding box helper
			const bboxHelper = createBoundingBoxHelper(scene, bboxColor);
			scene.add(bboxHelper);

			console.log(
				`[${category === 0 ? "Particles" : "Pores"}] Bounding box:`,
				box.min.toArray(), "→", box.max.toArray()
			);
		}

		// Direction vector from which to view the mesh
		const direction = new THREE.Vector3(0.9, 0.5, 0.8).normalize(); // Equal X and Y, some upward Z
		const distance = size * 1; // Pull back a bit more than size

		camera.position.copy(direction.clone().multiplyScalar(distance).add(center));
		camera.lookAt(center);

		// camera.near = Math.max(0.1, size / 10);
		// camera.far = size * 10;
		camera.near = size / 10;
    	camera.far = size * 10;
		camera.updateProjectionMatrix();

		cameraSetRef.current = true;
		// setModelLoaded(true);
		onLoad?.(scene, center, size, category, { min, max });				
	}, [camera, scene, onLoad, debugMode, category]);

	useEffect(() => {
		scene.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) return;

			const entityId = child.name;
			child.userData.particleId = entityId;

			// Store original material once
			if (!child.userData.originalMaterial && child.material) {
				child.userData.originalMaterial = child.material;
			}

			// Store raycast function once
			if (!child.userData.originalRaycast) {
				child.userData.originalRaycast = child.raycast;
			}

			// Handle highlight (selection)
			// Use originalMaterial if present; fall back to runtime child.material
			const originalMatFromUserData = child.userData.originalMaterial;
			let originalMat: THREE.Material | null = null;

			if (Array.isArray(originalMatFromUserData)) {
			// if original stored as array, use first element for color decisions
				originalMat = (originalMatFromUserData[0] as THREE.Material) ?? null;
			} else if (originalMatFromUserData) {
				originalMat = originalMatFromUserData as THREE.Material;
			} else if (child.material) {
				originalMat = Array.isArray(child.material) ? (child.material[0] as THREE.Material) : (child.material as THREE.Material);
			}

			// Now do selection / unselection
			if (selectedEntity?.id === entityId) {
				// Create a highlight material cloned from original to preserve originalMaterial
				const highlightMat = originalMat ? (originalMat.clone() as THREE.MeshStandardMaterial) : new THREE.MeshStandardMaterial();
				// Apply highlight colours / emissive but keep other properties cloned
				if ((highlightMat as any).color) (highlightMat as any).color = new THREE.Color('red');
				(highlightMat as any).emissive = new THREE.Color('yellow');
				highlightMat.transparent = originalMat?.transparent ?? false;
				child.material = highlightMat;
			} else {
				// Use the saved original material clone (always clone before applying overrides)
				let workingMat: THREE.Material;
				if (originalMat) {
					workingMat = originalMat.clone();
				} else {
					// ultimate fallback - clone current material
					workingMat = Array.isArray(child.material) ? (child.material[0] as THREE.Material).clone() : (child.material as THREE.Material).clone();
				}

				// Compute a reliable originalColor from original material (not runtime material)
				const originalColor =
					(originalMat && (originalMat as any).color instanceof THREE.Color)
					? (originalMat as any).color.clone()
					: new THREE.Color(0xC0C0C0);

				if (theme === 'Metallic') {
					// create a metallic variant while using originalColor
					const metallic = new THREE.MeshPhongMaterial({
					color: originalColor,
					shininess: 35,
					specular: new THREE.Color('#fffaed'),
					vertexColors: (workingMat as any).vertexColors ?? false
					});
					(metallic as any).flatShading = true;
					// copy transparency/opacity from workingMat (so user opacity remains)
					metallic.transparent = (workingMat as any).transparent ?? false;
					metallic.opacity = (workingMat as any).opacity ?? 1;
					workingMat.dispose?.(); // free the temporary clone if any
					workingMat = metallic;
				}

				// Global override (highest priority)
				if (typeof color === 'string') {
					if ((workingMat as any).color) (workingMat as any).color = new THREE.Color(color);
					(workingMat as any).vertexColors = false;
				} else {
					// dimmed fallback uses dimmedOptions color
					if (dimmed && typeof dimmedOptions?.color === 'string' && (workingMat as any).color) {
					(workingMat as any).color = new THREE.Color(dimmedOptions.color);
					(workingMat as any).vertexColors = false;
					}
				}

				if (typeof opacity === 'number') {
					(workingMat as any).transparent = true;
					(workingMat as any).opacity = opacity;
				} else if (opacity === undefined && dimmed && typeof dimmedOptions?.opacity === 'number') {
					(workingMat as any).transparent = true;
					(workingMat as any).opacity = dimmedOptions.opacity;
				}

				child.material = workingMat;
			}

			// Handle visibility
			const center = new THREE.Vector3();
			new THREE.Box3().setFromObject(child).getCenter(center);

			// Adjust to match camera-centered coordinate space
			const adjustedCenter = combinedCenter
				? center.clone().sub(combinedCenter)
				: center;

			const isGloballyVisible = visible;
			const isLocallyHidden = hiddenIds.has(entityId);
			let finalVisible = isGloballyVisible && !isLocallyHidden

			if (category === 0) {
				const shouldSlice = slicingActive && typeof sliceXThreshold === 'number';
				const isSliceHidden = shouldSlice && adjustedCenter.x > (sliceXThreshold ?? 0);
				finalVisible = finalVisible && !isSliceHidden;
			}

			child.visible = finalVisible;
			child.raycast = finalVisible ? child.userData.originalRaycast : () => {};
		});
	}, [scene, hiddenIds, selectedEntity, dimmed, dimmedOptions, visible, color, opacity, shouldSlice, sliceXThreshold, combinedCenter, category, slicingActive, theme]);


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
		const mesh = event.object as THREE.Mesh;
		if (!mesh) return;
		const id = mesh.userData.particleId;
		if (id) onEntityClick?.(category, id, mesh);
	};

	const handleRightClick = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		event.nativeEvent.preventDefault();

		const mesh = event.object as THREE.Mesh;
		if (!mesh) return;

		const id = mesh.userData.particleId;
		
		if (id) onEntityRightClick?.(category, id, mesh);
	};

	if (!combinedCenter) return null;

	return <primitive object={scene} onClick={handleClick} onContextMenu={handleRightClick} />;
};

export default observer(Model);