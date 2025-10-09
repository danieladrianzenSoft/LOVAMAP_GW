// ModelArrayBuffer.tsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import * as THREE from "three";
// import { GLTF, GLTFLoader } from "three-stdlib"; // or 'three/examples/jsm/loaders/GLTFLoader' depending on setup
// import { clone } from "three/examples/jsm/utils/SkeletonUtils";
// import { ThreeEvent } from "@react-three/fiber";

// interface ModelProps {
//   buffer: ArrayBuffer | null;
//   url?: string | null;
//   category: number;
//   visible: boolean;
//   hiddenIds: Set<string>;
//   selectedEntity: ({ id: string; mesh: THREE.Mesh } | null);
//   combinedCenter?: THREE.Vector3;
//   onLoad?: (
//     loadedScene: THREE.Object3D,
//     center: THREE.Vector3,
//     size: number,
//     category: number,
//     bounds: { min: THREE.Vector3; max: THREE.Vector3 }
//   ) => void;
//   onEntityClick?: (category: number, id: string, mesh: THREE.Mesh) => void;
//   onEntityRightClick?: (category: number, id: string, mesh: THREE.Mesh) => void;
//   color?: string;
//   opacity?: number;
//   dimmed?: boolean;
//   dimmedOptions?: { color?: string; opacity?: number };
//   debugMode?: boolean;
//   slicingActive?: boolean;
//   sliceXThreshold?: number | null;
//   theme?: "Default" | "Metallic";
// }

// function disposeObject3D(obj: THREE.Object3D) {
//   obj.traverse((child: any) => {
//     if (child.geometry) {
//       try { child.geometry.dispose(); } catch {}
//     }
//     if (child.material) {
//       const mats = Array.isArray(child.material) ? child.material : [child.material];
//       mats.forEach((m: any) => {
//         // dispose textures referenced in material
//         for (const key in m) {
//           const value = m[key];
//           if (value && value.isTexture) {
//             try { value.dispose(); } catch {}
//           }
//         }
//         try { m.dispose(); } catch {}
//       });
//     }
//   });
// }

// const ModelArrayBuffer: React.FC<ModelProps> = ({
//   buffer,
//   category,
//   visible,
//   hiddenIds,
//   selectedEntity,
//   combinedCenter,
//   onLoad,
//   onEntityClick,
//   onEntityRightClick,
//   color,
//   opacity,
//   dimmed,
//   dimmedOptions,
//   debugMode,
//   slicingActive,
//   sliceXThreshold,
//   theme,
// }) => {
//   const [gltfScene, setGltfScene] = useState<THREE.Object3D | null>(null);
//   const loaderRef = useRef<GLTFLoader | null>(null);
//   const parsedRef = useRef<GLTF | null>(null);
//   const cameraSetRef = useRef(false);

//   useEffect(() => {
//     if (!buffer) {
//       // nothing to load
//       setGltfScene(null);
//       parsedRef.current = null;
//       return;
//     }

//     loaderRef.current = new GLTFLoader();

//     let cancelled = false;
//     (async () => {
//       try {
//         // parse arrayBuffer to GLTF (no network, no object URL)
//         const gltf = await new Promise<GLTF>((resolve, reject) => {
//           loaderRef.current!.parse(buffer, "", (result) => resolve(result), (err) => reject(err));
//         });
//         if (cancelled) {
//           // immediate dispose parsed gltf if we loaded after cancellation
//           // gltf.scene traversal disposal below will handle it
//           return;
//         }

//         // clone to own the tree (so we can safely dispose it on unmount)
//         const cloned = clone(gltf.scene);
//         parsedRef.current = gltf; // keep reference if needed
//         setGltfScene(cloned);

//       } catch (err) {
//         console.error("GLB parse/load failed", err);
//       }
//     })();

//     return () => {
//       cancelled = true;
//       // we don't dispose here — the cleanup below handles the last created scene
//     };
//   }, [buffer]);

//   // run on first scene ready — sizing / camera adjustments and notify parent
//   useEffect(() => {
//     if (!gltfScene) return;
//     const box = new THREE.Box3().setFromObject(gltfScene);
//     const size = box.getSize(new THREE.Vector3()).length();
//     const center = box.getCenter(new THREE.Vector3());
//     const min = box.min.clone();
//     const max = box.max.clone();
//     onLoad?.(gltfScene, center, size, category, { min, max });
//   }, [gltfScene, onLoad, category]);

//   // apply per-mesh material/visibility changes
//   useEffect(() => {
//     if (!gltfScene) return;

//     gltfScene.traverse((child: any) => {
//       if (!(child instanceof THREE.Mesh)) return;
//       const entityId = child.name;
//       child.userData.particleId = entityId;

//       // cache originalMaterial on this clone
//       if (!child.userData.originalMaterial && child.material) {
//         child.userData.originalMaterial = child.material;
//       }

//       // create one workingMaterial per child (if not exist)
//       if (!child.userData.workingMaterial) {
//         try {
//           child.userData.workingMaterial = Array.isArray(child.userData.originalMaterial)
//             ? child.userData.originalMaterial.map((m:any) => m.clone())
//             : (child.userData.originalMaterial as THREE.Material).clone();
//         } catch {
//           child.userData.workingMaterial = new THREE.MeshStandardMaterial();
//         }
//       }

//       let workingMat = child.userData.workingMaterial;
//       if (Array.isArray(workingMat)) workingMat = workingMat[0];

//       if (selectedEntity?.id === entityId) {
//         if (!child.userData.highlightMaterial) {
//           child.userData.highlightMaterial = new THREE.MeshStandardMaterial({ color: "red", emissive: "yellow" });
//         }
//         child.material = child.userData.highlightMaterial;
//       } else {
//         const mat = workingMat as any;
//         if (typeof color === "string" && mat.color) {
//           mat.color = new THREE.Color(color);
//           mat.vertexColors = false;
//         }
//         if (typeof opacity === "number") {
//           mat.transparent = true;
//           mat.opacity = opacity;
//         } else if (opacity === undefined && dimmed && typeof dimmedOptions?.opacity === "number") {
//           mat.transparent = true;
//           mat.opacity = dimmedOptions.opacity;
//         } else {
//           mat.transparent = false;
//           mat.opacity = 1;
//         }

//         if (theme === "Metallic") {
//           if (!child.userData.metallicMaterial) {
//             child.userData.metallicMaterial = new THREE.MeshPhongMaterial({
//               color: mat.color ? mat.color.clone() : new THREE.Color(0xc0c0c0),
//               shininess: 35,
//               specular: new THREE.Color('#fffaed'),
//             });
//           }
//           child.material = child.userData.metallicMaterial;
//         } else {
//           child.material = mat;
//         }
//       }

//       // visibility
//       const center = new THREE.Vector3();
//       new THREE.Box3().setFromObject(child).getCenter(center);
//       const adjustedCenter = combinedCenter ? center.clone().sub(combinedCenter) : center;

//       let finalVisible = !!visible && !hiddenIds.has(entityId);
//       if (category === 0 && slicingActive && typeof sliceXThreshold === "number") {
//         const isSliceHidden = adjustedCenter.x > (sliceXThreshold ?? 0);
//         finalVisible = finalVisible && !isSliceHidden;
//       }
//       child.visible = finalVisible;
//       child.raycast = finalVisible ? (child.userData.originalRaycast || child.raycast) : () => {};
//     });
//   }, [gltfScene, hiddenIds, selectedEntity, dimmed, dimmedOptions, visible, color, opacity, slicingActive, sliceXThreshold, combinedCenter, category, theme]);

//   // cleanup: dispose cloned scene materials/geometries we created
//   useEffect(() => {
//     return () => {
//       if (gltfScene) {
//         // dispose userData-created materials
//         gltfScene.traverse((child: any) => {
//           if (child.userData) {
//             if (child.userData.workingMaterial) {
//               const wm = child.userData.workingMaterial;
//               const arr = Array.isArray(wm) ? wm : [wm];
//               arr.forEach((m:any) => {
//                 for (const key in m) {
//                   const value = m[key];
//                   if (value && value.isTexture) {
//                     try { value.dispose(); } catch {}
//                   }
//                 }
//                 try { m.dispose(); } catch {}
//               });
//             }
//             if (child.userData.highlightMaterial) {
//               try { child.userData.highlightMaterial.dispose(); } catch {}
//             }
//             if (child.userData.metallicMaterial) {
//               try { child.userData.metallicMaterial.dispose(); } catch {}
//             }
//           }
//         });
//         // finally dispose geometries & any materials left
//         disposeObject3D(gltfScene);
//       }
//       // also free parsedRef GLTF if any (not necessary for ArrayBuffer)
//       if (parsedRef.current) {
//         // parsedRef.current = null; // allow GC
//       }
//     };
//   }, [gltfScene]);

//   // click handlers
//   const handleClick = (event: ThreeEvent<PointerEvent>) => {
//     event.stopPropagation();
//     const mesh = event.object as THREE.Mesh;
//     if (!mesh) return;
//     const id = mesh.userData.particleId;
//     if (id) onEntityClick?.(category, id, mesh);
//   };

//   const handleRightClick = (event: ThreeEvent<PointerEvent>) => {
//     event.stopPropagation();
//     event.nativeEvent.preventDefault();
//     const mesh = event.object as THREE.Mesh;
//     if (!mesh) return;
//     const id = mesh.userData.particleId;
//     if (id) onEntityRightClick?.(category, id, mesh);
//   };

//   if (!gltfScene) return null;
//   return <primitive object={gltfScene} onClick={handleClick} onContextMenu={handleRightClick} />;
// };

// export default ModelArrayBuffer;

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
			if (selectedEntity?.id === entityId) {
				child.material = new THREE.MeshStandardMaterial({
					color: "red",
					emissive: "yellow",
				});
			} else {
				// Clone original material
				const originalMat = child.userData.originalMaterial as THREE.MeshStandardMaterial;

				let workingMat: THREE.Material;

				const runtimeColor = (child.material as any)?.color;
				const originalColor = runtimeColor instanceof THREE.Color
					? runtimeColor.clone()
					: new THREE.Color(0xC0C0C0);

				if (theme === 'Metallic') {
					workingMat = new THREE.MeshPhongMaterial({
						color: originalColor,
						shininess: 35,              // Intensity of specular highlights
						specular: new THREE.Color('#fffaed'),
						vertexColors: true
					});
					(workingMat as any).flatShading = true;
				} else {
					workingMat = (originalMat as THREE.Material).clone();
				}

				// Global override (highest priority)
				if (typeof color === "string") {
					if (
						(workingMat as any).color &&
						typeof color === "string"
					) {
						(workingMat as THREE.MeshPhongMaterial | THREE.MeshStandardMaterial).color = new THREE.Color(color);
						(workingMat as THREE.MeshPhongMaterial | THREE.MeshStandardMaterial).vertexColors = false;
					}
					workingMat.vertexColors = false;
				}
				if (typeof opacity === "number") {
					workingMat.transparent = true;
					workingMat.opacity = opacity;
				}

				// Dimmed fallback
				if (color === undefined && dimmed && typeof dimmedOptions?.color === "string") {
					if (
						(workingMat as any).color &&
						color === undefined &&
						dimmed &&
						typeof dimmedOptions?.color === "string"
					) {
						(workingMat as THREE.MeshPhongMaterial | THREE.MeshStandardMaterial).color = new THREE.Color(dimmedOptions.color);
						(workingMat as THREE.MeshPhongMaterial | THREE.MeshStandardMaterial).vertexColors = false;
					}
					workingMat.vertexColors = false;
				}
				if (opacity === undefined && dimmed && typeof dimmedOptions?.opacity === "number") {
					// console.log(`Applying dimmed opacity ${dimmedOptions.opacity} to entity ${entityId}`);
					workingMat.transparent = true;
					workingMat.opacity = dimmedOptions.opacity;
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