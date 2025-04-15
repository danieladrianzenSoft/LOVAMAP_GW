import React, { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import Model from './model';
import { useParams } from 'react-router-dom';
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import * as THREE from "three";

interface ScreenshotSceneProps {
	url: string;
	onScreenshotReady?: (blob: Blob) => void;
}

const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({ url, onScreenshotReady }) => {
	const { camera, scene } = useThree();
	const cameraSetRef = useRef(false);

	useEffect(() => {
		if (!scene || cameraSetRef.current) {
			console.log("scene not ready or already set");
			return;
		}

		// Compute bounding box of loaded model
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3()).length();
		const center = box.getCenter(new THREE.Vector3());

		// Center the model
		scene.position.set(-center.x, -center.y, -center.z);

		// Flip Z-axis to view mesh from behind
		const optimalDistance = Math.max(2, size * 0.7);
		camera.position.set(optimalDistance, optimalDistance * 0.6, -optimalDistance * 1.2);
		camera.lookAt(new THREE.Vector3(0, 0, 0));

		camera.near = Math.max(0.1, size / 10);
		camera.far = size * 10;
		camera.updateProjectionMatrix();

		cameraSetRef.current = true;

		const timeout = setTimeout(() => {
			(window as any).THUMBNAIL_READY = true;
		
			if (onScreenshotReady) {
				// Delay to ensure frame is fully rendered
				setTimeout(() => {
					const canvas = document.querySelector("canvas");

					if (canvas) {
						canvas.toBlob((blob) => {
							if (blob) {
								console.log("Screenshot captured");
								onScreenshotReady(blob);
							} else {
								console.warn("Failed to capture screenshot — blob was null");
							}
						}, "image/png");
					}
				}, 100); // Small delay after marking ready
			}
		}, 300);

		return () => clearTimeout(timeout);
	}, [camera, scene, onScreenshotReady]);

	return (
		<>
			<ambientLight intensity={0.5} />
			<directionalLight position={[5, 5, 5]} intensity={0.8} />
			<Environment preset="lobby" />
			<Model
				url={url}
				selectedParticle={null}
				hiddenParticles={new Set()}
				setHistory={() => {}}
			/>
		</>
	);
};

interface ScreenshotViewerProps {
	scaffoldId?: number;
	onScreenshotReady?: (blob: Blob) => void;
}

const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({ scaffoldId: propId, onScreenshotReady }) => {
	const { scaffoldId: paramId } = useParams<{ scaffoldId: string }>();
	const { domainStore } = useStore();
	const { domainMeshUrl, visualizeDomain, clearDomainMesh } = domainStore;

	const resolvedId = propId ?? (paramId ? parseInt(paramId) : undefined);
	const isRouteMode = !propId;

	useEffect(() => {
		if (!resolvedId) return;

		visualizeDomain(resolvedId).catch(() => {
			clearDomainMesh();
		});

		return () => {
			clearDomainMesh();
		};
	}, [resolvedId, visualizeDomain, clearDomainMesh]);

	const handleManualScreenshot = () => {
		const canvas = document.querySelector("canvas") as HTMLCanvasElement;
		if (canvas) {
			canvas.toBlob((blob) => {
				if (!blob) return;
	
				// Option A: upload to your backend
				// You can re-use your store method here if you want
	
				// Option B: download directly
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `scaffold-${resolvedId}.png`;
				link.click();
				URL.revokeObjectURL(url);
			}, "image/png");
		}
	};

	if (!resolvedId) return null;

	if (!domainMeshUrl) {
		return <p>Loading mesh...</p>;
	}

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
				camera={{ position: [2, 1.5, 3], fov: 50 }}
				gl={{ preserveDrawingBuffer: true }}
			>
				<ScreenshotScene url={domainMeshUrl} onScreenshotReady={onScreenshotReady} />
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