import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import Model from './model';
import { useParams, useSearchParams } from 'react-router-dom';
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
	const { camera, scene, gl } = useThree();
	const [readyForScreenshot, setReadyForScreenshot] = useState(false);
	const [hasRendered, setHasRendered] = useState(false); // state used to trigger useEffect
	const hasRenderedRef = useRef(false);
	const hasCapturedRef = useRef(false); // prevent double capture

	const handleModelLoad = (loadedObject: THREE.Object3D) => {
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
		invalidate();

		setReadyForScreenshot(true); // trigger the next render frame to capture
	};

	// Wait until the next frame AFTER readyForScreenshot is true
	useFrame(() => {
		if (readyForScreenshot && !hasRenderedRef.current) {
			hasRenderedRef.current = true;
			setHasRendered(true); // triggers useEffect
		}
	});

	// In useEffect — perform the screenshot
	// Wait 50ms AFTER render pass to capture canvas
	useEffect(() => {
		if (hasRendered && !hasCapturedRef.current) {
			const timeout = setTimeout(() => {
				hasCapturedRef.current = true;
				gl.domElement.toBlob((blob) => {
					if (blob && onScreenshotReady) {
						console.log("📸 Screenshot captured after render+timeout");
						onScreenshotReady(blob);
					} else {
						console.warn("❌ Failed to capture screenshot");
					}
				}, "image/png");
			}, 50);

			return () => clearTimeout(timeout);
		}
	}, [gl.domElement, hasRendered, onScreenshotReady]);

	useEffect(() => {
		useGLTF.clear(url);
		scene.clear();
	}, [url, scene]);

	return (
		<>
			<ambientLight intensity={0.5} />
			<directionalLight position={[5, 5, 5]} intensity={0.8} />
			<Environment preset="lobby" />
			<Model
				key={`model-${category}-${url}`}
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

// const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({ url, category, canvasRef, onScreenshotReady }) => {
// 	const { camera, scene } = useThree();
// 	const cameraSetRef = useRef(false);

// 	const handleModelLoad = (loadedObject: THREE.Object3D) => {
// 		console.log(`✅ Model loaded: Category: ${category}`);

// 		const box = new THREE.Box3().setFromObject(loadedObject);
// 		const size = box.getSize(new THREE.Vector3()).length();
// 		const center = box.getCenter(new THREE.Vector3());

// 		scene.position.set(-center.x, -center.y, -center.z);

// 		const isoDistance = Math.max(2, size * 0.7);
// 		camera.position.set(isoDistance, isoDistance * 0.6, isoDistance);
// 		camera.lookAt(new THREE.Vector3(0, 0, 0));

// 		camera.near = Math.max(0.1, size / 10);
// 		camera.far = size * 10;
// 		camera.updateProjectionMatrix();

// 		cameraSetRef.current = true;

// 		requestAnimationFrame(() => {
// 			requestAnimationFrame(() => {
// 				const canvas = canvasRef.current;
// 				if (canvas) {
// 					canvas.toBlob((blob) => {
// 						if (blob && onScreenshotReady) {
// 							console.log("📸 Screenshot captured!");
// 							onScreenshotReady(blob);
// 						} else {
// 							console.warn("❌ Failed to capture screenshot");
// 						}
// 					}, "image/png");
// 				}
// 			});
// 		});
// 	};

// 	useEffect(() => {
// 		useGLTF.clear(url); // flush GLTF cache for this blob URL
// 	}, [url]);

// 	useEffect(() => {
// 		scene.clear();
// 	}, [scene]);

// 	return (
// 		<>
// 			<ambientLight intensity={0.5} />
// 			<directionalLight position={[5, 5, 5]} intensity={0.8} />
// 			<Environment preset="lobby" />
// 			<Model
// 				key={`model-${category}-${url}`}
// 				url={url}
// 				visible={true}
// 				category={category}
// 				selectedEntity={null}
// 				hiddenIds={new Set()}
// 				onLoad={handleModelLoad}
// 			/>
// 		</>
// 	);
// };

interface ScreenshotViewerProps {
	scaffoldId?: number;
	category?: number;
	onScreenshotReady?: (blob: Blob) => void;
}

const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({ scaffoldId: propId, category: propCategory, onScreenshotReady }) => {
	const { scaffoldId: paramId } = useParams<{ scaffoldId: string }>();
	const [searchParams] = useSearchParams();
	const { domainStore } = useStore();
	const [localMeshUrl, setLocalMeshUrl] = useState<string | null>(null);

	const categoryFromQuery = parseInt(searchParams.get("category") ?? "0");
	const resolvedId = propId ?? (paramId ? parseInt(paramId) : undefined);
	const resolvedCategory = propCategory ?? categoryFromQuery;
	const isRouteMode = !propId;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const hasFetched = useRef(false);

	useEffect(() => {
		if (!resolvedId || hasFetched.current) return;
    	hasFetched.current = true;

		let activeUrl: string | null = null;

		const loadMesh = async () => {
			try {
				const { blobUrl } = await domainStore.fetchMeshForScreenshot(resolvedId, resolvedCategory);
				activeUrl = blobUrl;
				setLocalMeshUrl(blobUrl);
				console.log(resolvedCategory);
			} catch (e) {
				console.error("Failed to load mesh for screenshot:", e);
			}
		};

		loadMesh();

		return () => {
			if (activeUrl) {
				URL.revokeObjectURL(activeUrl);
				useGLTF.clear(activeUrl);
			}
			setLocalMeshUrl(null);
			hasFetched.current = false;
		};
	}, [resolvedId, resolvedCategory, domainStore]);

	const handleManualScreenshot = () => {
		const canvas = canvasRef.current;
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
				ref={canvasRef}
				key={`${resolvedId}-${resolvedCategory}`}
				camera={{ position: [2, 1.5, 3], fov: 50 }}
				style={{ width: "512px", height: "512px" }}
				gl={{ preserveDrawingBuffer: true }}
				onCreated={({ gl }) => console.log("Canvas created", gl)}
			>
				{/* <ScreenshotScene url={domainMeshUrl} onScreenshotReady={onScreenshotReady} /> */}
				<Suspense fallback={null}>
					<ScreenshotScene url={localMeshUrl} category={resolvedCategory} onScreenshotReady={onScreenshotReady}/>
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