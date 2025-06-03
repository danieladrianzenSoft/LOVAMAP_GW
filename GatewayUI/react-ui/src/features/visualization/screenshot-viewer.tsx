import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import Model from './model';
import { useParams } from 'react-router-dom';
import { observer } from "mobx-react-lite";
// import { useStore } from "../../app/stores/store";
import * as THREE from "three";
import { useStore } from "../../app/stores/store";

interface ScreenshotSceneProps {
	url: string;
	category: number;
	onScreenshotReady?: (blob: Blob) => void;
}

const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({ url, category, onScreenshotReady }) => {
	const { camera, scene } = useThree();
	const cameraSetRef = useRef(false);

	const handleModelLoad = (loadedObject: THREE.Object3D) => {
		console.log("✅ Model loaded");

		const box = new THREE.Box3().setFromObject(loadedObject);
		const size = box.getSize(new THREE.Vector3()).length();
		const center = box.getCenter(new THREE.Vector3());

		scene.position.set(-center.x, -center.y, -center.z);

		const isoDistance = Math.max(2, size * 0.7);
		camera.position.set(isoDistance, isoDistance * 0.6, isoDistance);
		camera.lookAt(new THREE.Vector3(0, 0, 0));

		camera.near = Math.max(0.1, size / 10);
		camera.far = size * 10;
		camera.updateProjectionMatrix();

		cameraSetRef.current = true;

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const canvas = document.querySelector("canvas");
				if (canvas) {
					canvas.toBlob((blob) => {
						if (blob && onScreenshotReady) {
							console.log("📸 Screenshot captured!");
							onScreenshotReady(blob);
						} else {
							console.warn("❌ Failed to capture screenshot");
						}
					}, "image/png");
				}
			});
		});
	};

	return (
		<>
			<ambientLight intensity={0.5} />
			<directionalLight position={[5, 5, 5]} intensity={0.8} />
			<Environment preset="lobby" />
			<Model
				url={url}
				visible={true}
				category={category}
				selectedEntity={null}
				hiddenIds={new Set()}
				onLoad={handleModelLoad}
			/>
		</>
	);
};

// const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({ url, category, onScreenshotReady }) => {
// 	const { camera, scene } = useThree();
// 	const cameraSetRef = useRef(false);

// 	useEffect(() => {
// 		console.log("Screenshot Scene - url - start useEffect:", url );
// 		if (!scene || cameraSetRef.current) {
// 			console.log("scene not ready or already set");
// 			return;
// 		}

// 		// Compute bounding box of loaded model
// 		const box = new THREE.Box3().setFromObject(scene);
// 		const size = box.getSize(new THREE.Vector3()).length();
// 		const center = box.getCenter(new THREE.Vector3());

// 		// Center the model
// 		scene.position.set(-center.x, -center.y, -center.z);

// 		// Flip Z-axis to view mesh from behind
// 		// const optimalDistance = Math.max(2, size * 0.7);
// 		const isoDistance = Math.max(2, size * 0.7);;
// 		// camera.position.set(optimalDistance, optimalDistance * 0.6, -optimalDistance * 1.2);
// 		camera.position.set(isoDistance, isoDistance * 0.6, isoDistance);
// 		camera.lookAt(new THREE.Vector3(0, 0, 0));

// 		camera.near = Math.max(0.1, size / 10);
// 		camera.far = size * 10;
// 		camera.updateProjectionMatrix();

// 		cameraSetRef.current = true;

// 		const timeout = setTimeout(() => {
// 			(window as any).THUMBNAIL_READY = true;
// 			console.log("Screenshot Scene - url:", url );

		
// 			if (onScreenshotReady) {
// 				// Delay to ensure frame is fully rendered
// 				setTimeout(() => {
// 					const canvas = document.querySelector("canvas");

// 					if (canvas) {
// 						canvas.toBlob((blob) => {
// 							if (blob) {
// 								console.log("Screenshot captured");
// 								onScreenshotReady(blob);
// 							} else {
// 								console.warn("Failed to capture screenshot — blob was null");
// 							}
// 						}, "image/png");
// 					}
// 				}, 200); // Small delay after marking ready
// 			}
// 		}, 500);

// 		return () => clearTimeout(timeout);
// 	}, [camera, scene, onScreenshotReady, url]);

// 	return (
// 		<>
// 			<ambientLight intensity={0.5} />
// 			<directionalLight position={[5, 5, 5]} intensity={0.8} />
// 			<Environment preset="lobby" />
// 			<Model
// 				url={url}
// 				visible={true}
// 				category={category}
// 				selectedEntity={null}
// 				hiddenIds={new Set()}
// 			/>
// 		</>
// 	);
// };

interface ScreenshotViewerProps {
	scaffoldId?: number;
	category?: number;
	onScreenshotReady?: (blob: Blob) => void;
}

const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({ scaffoldId: propId, category = 0, onScreenshotReady }) => {
	const { scaffoldId: paramId } = useParams<{ scaffoldId: string }>();
	const { domainStore } = useStore();
	const [localMeshUrl, setLocalMeshUrl] = useState<string | null>(null);

	const resolvedId = propId ?? (paramId ? parseInt(paramId) : undefined);
	const isRouteMode = !propId;

	useEffect(() => {
		if (!resolvedId) return;

		let activeUrl: string | null = null;

		const loadMesh = async () => {
			try {
				const { blobUrl } = await domainStore.fetchMeshForScreenshot(resolvedId, category);
				activeUrl = blobUrl;
				setLocalMeshUrl(blobUrl);
			} catch (e) {
				console.error("Failed to load mesh for screenshot:", e);
			}
		};

		loadMesh();

		return () => {
			if (activeUrl) URL.revokeObjectURL(activeUrl);
			setLocalMeshUrl(null);
		};
	}, [resolvedId, category, domainStore]);

	const handleManualScreenshot = () => {
		const canvas = document.querySelector("canvas") as HTMLCanvasElement;
		if (canvas) {
			canvas.toBlob((blob) => {
				if (!blob) return;
	
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `scaffold-${resolvedId}.png`;
				link.click();
				URL.revokeObjectURL(url);
			}, "image/png");
		}
	};

	if (!resolvedId || !localMeshUrl) return null;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				position: "relative",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<Canvas
				key={localMeshUrl}
				camera={{ position: [2, 1.5, 3], fov: 50 }}
				gl={{ preserveDrawingBuffer: true }}
				onCreated={({ gl }) => console.log("Canvas created", gl)}
			>
				{/* <ScreenshotScene url={domainMeshUrl} onScreenshotReady={onScreenshotReady} /> */}
				<Suspense fallback={null}>
					<ScreenshotScene url={localMeshUrl} category={category} onScreenshotReady={onScreenshotReady} />
				</Suspense>
			</Canvas>

			{/* 📸 Screenshot button (only in route mode) */}
			{isRouteMode && (
				<div style={{ position: "absolute", top: 40, right: 20, zIndex: 10 }}>
					<button
						className="button-primary"
						onClick={handleManualScreenshot}
					>
						Take Screenshot
					</button>
				</div>
			)}
		</div>
	);
};

export default observer(ScreenshotViewer);