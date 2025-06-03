import React, { useEffect, useRef } from 'react';
import { useThree, ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from 'three';
import { observer } from 'mobx-react-lite';

interface ModelProps {
	url: string;
	category: number;
	visible: boolean;
	hiddenIds: Set<string>;
	selectedEntity: ({ id: string, mesh: THREE.Mesh } | null);

	// Interactivity
	onLoad?: (loadedScene: THREE.Object3D, center: THREE.Vector3, size: number) => void;
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
}

function createBoundingBoxHelper(object: THREE.Object3D, color: string): THREE.BoxHelper {
	const boxHelper = new THREE.BoxHelper(object, color);
	boxHelper.name = 'BoundingBoxHelper';
	return boxHelper;
}

const Model: React.FC<ModelProps> = ({url, category, visible, onLoad, hiddenIds, selectedEntity, onEntityClick, onEntityRightClick, color, opacity, dimmed, dimmedOptions, debugMode }) => {
	const { scene } = useGLTF(url);
	const { camera } = useThree();
	const cameraSetRef = useRef(false);

	useEffect(() => {
		if (!scene || cameraSetRef.current) return;

		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3())?.length();
		const center = box.getCenter(new THREE.Vector3());

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
		onLoad?.(scene, center, size);				
	}, [camera, scene, onLoad, debugMode, category]);

	useEffect(() => {
		scene.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) return;

			// console.log("Applying material for:", child.name, {
			// 	dimmed,
			// 	selected: selectedEntity?.id === child.name,
			// 	colorOverride: dimmedOptions?.color,
			// 	finalColor: (child.material as any)?.color?.getHexString?.(),
			// });

			const entityId = child.name;
			child.userData.particleId = entityId;

			// Store original material (only once)
			if (!child.userData.originalMaterial) {
				child.userData.originalMaterial = Array.isArray(child.material)
					? [...child.material]
					: child.material;
			}

			// Store original raycast function (only once)
			if (!child.userData.originalRaycast) {
				child.userData.originalRaycast = child.raycast;
			}

			// Selection override (highlight)
			if (selectedEntity?.id === entityId) {
				child.material = new THREE.MeshStandardMaterial({
					color: "red",
					emissive: "yellow",
				});
			}
			// Dimmed rendering for context-only display
			else if (dimmed) {
				child.material = createDimmedMaterial(dimmedOptions, opacity);
				
				// const originalMaterial = child.userData.originalMaterial;

				// const colorToUse = dimmedOptions?.color ?? "#E7F6E3";
				// const opacityToUse =
				// 	typeof opacity === "number"
				// 		? opacity
				// 		: dimmedOptions?.opacity ?? 0.15;

				// const currentMat = child.userData.dimmedMaterial;

				// const needsNewMaterial =
				// 	!currentMat ||
				// 	currentMat.opacity !== opacityToUse ||
				// 	currentMat.color.getStyle() !== colorToUse;

				// if (needsNewMaterial) {
				// 	child.userData.dimmedMaterial = cloneDimmedMaterial(
				// 		originalMaterial,
				// 		dimmedOptions,
				// 		opacity
				// 	);
				// }

				// child.material = child.userData.dimmedMaterial;

			}
			else {
				const baseMaterial = cloneWithOverrides(
					child.userData.originalMaterial ?? new THREE.MeshStandardMaterial(),
					{ color, opacity }
				);
				child.material = baseMaterial;
			}
			// Restore original material if not selected or dimmed
			// else if (child.userData.originalMaterial) {
			// 	child.material = child.userData.originalMaterial;
			// }

			const isGloballyVisible = visible; // prop passed to <Model>
			const isLocallyHidden = hiddenIds.has(entityId);
			const finalVisible = isGloballyVisible && !isLocallyHidden;

			child.visible = finalVisible;
			child.raycast = finalVisible
				? child.userData.originalRaycast
				: () => {};
		});
	}, [scene, hiddenIds, selectedEntity, dimmed, dimmedOptions, visible, color, opacity]);


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

	function cloneDimmedMaterial(
		original: THREE.Material,
		options?: { color?: string; opacity?: number },
		sliderOpacity?: number
	): THREE.MeshStandardMaterial {
		const color = options?.color ?? "#E7F6E3";
		const opacity = typeof sliderOpacity === "number"
			? sliderOpacity
			: options?.opacity ?? 0.15;

		let meshMat: THREE.MeshStandardMaterial;

		if (original instanceof THREE.MeshStandardMaterial) {
			meshMat = original.clone();
		} else {
			const fallbackColor = (original as any).color instanceof THREE.Color
				? (original as any).color.clone()
				: new THREE.Color("#ffffff");

			meshMat = new THREE.MeshStandardMaterial({
				color: fallbackColor,
				opacity: original.opacity,
				transparent: original.transparent,
			});
		}

		// Apply dimming overrides
		meshMat.transparent = true;
		meshMat.opacity = opacity;
		meshMat.color = new THREE.Color(color);

		return meshMat;
	}

	function createDimmedMaterial(options?: { color?: string; opacity?: number }, sliderOpacity?: number): THREE.MeshStandardMaterial {
		const color = options?.color ?? "#E7F6E3";
		const opacity = typeof sliderOpacity === 'number'
			? sliderOpacity
			: options?.opacity ?? 0.15;

		const material = new THREE.MeshStandardMaterial({
			color: new THREE.Color(color),
			transparent: true,
			opacity,
			// depthWrite: false,
		});

		return material;
	}

	function cloneWithOverrides(
		original: THREE.Material,
		overrides: { color?: string; opacity?: number }
		): THREE.MeshStandardMaterial {
		let meshMat: THREE.MeshStandardMaterial;

		// Convert to MeshStandardMaterial if needed
		if (original instanceof THREE.MeshStandardMaterial) {
			meshMat = original.clone();
		} else {
			// Create a basic fallback clone using whatever values we can
			const fallbackColor =
			(original as any).color instanceof THREE.Color
				? (original as any).color.clone()
				: new THREE.Color("#ffffff");

			meshMat = new THREE.MeshStandardMaterial({
			color: fallbackColor,
			opacity: original.opacity,
			transparent: original.transparent,
			});
		}

		// Apply overrides
		if (overrides.color) {
			meshMat.color = new THREE.Color(overrides.color);
		}

		if (typeof overrides.opacity === "number") {
			meshMat.transparent = true;
			meshMat.opacity = overrides.opacity;
		}

		return meshMat;
	}

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

	return <primitive object={scene} onClick={handleClick} onContextMenu={handleRightClick} />;
};

export default observer(Model);