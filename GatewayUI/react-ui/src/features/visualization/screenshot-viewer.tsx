import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
  // we'll use this in section 2:
  theme?: 'Metallic' | 'Sunset';
}

const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({
  url,
  category,
  onScreenshotReady,
  theme,
}) => {
  const { camera, scene, gl } = useThree();
  const [readyForScreenshot, setReadyForScreenshot] = useState(false);
  const hasCapturedRef = useRef(false);
  const framesSinceReadyRef = useRef(0);

  const [combinedCenter] = useState(() => new THREE.Vector3(0, 0, 0))

  const handleModelLoad = (loadedObject: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(loadedObject);
    const sizeVec = box.getSize(new THREE.Vector3());
    const size = sizeVec.length();
    const center = box.getCenter(new THREE.Vector3());

    // Center the model
    scene.position.set(-center.x, -center.y, -center.z);
	const direction = new THREE.Vector3(0.9, 0.5, 0.8).normalize();
	const distance = size * 0.6;
	const newPosition = direction.multiplyScalar(distance).add(center);

    // Simple isometric camera framing
    // const isoDistance = Math.max(2, size * 0.7);
    // camera.position.set(isoDistance, isoDistance * 0.6, isoDistance);
	camera.position.copy(newPosition);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    camera.near = Math.max(0.1, size / 10);
    camera.far = size * 10;
    camera.updateProjectionMatrix();

    // Flag that we’re ready to wait a couple frames then capture
    framesSinceReadyRef.current = 0;
    setReadyForScreenshot(true);
  };
  

  // Wait for a couple of render frames after `readyForScreenshot`
  // so the model + lighting are guaranteed to be on screen
  useFrame(() => {
    if (!readyForScreenshot || hasCapturedRef.current) return;

    framesSinceReadyRef.current += 1;

    // 2–3 frames is usually enough; bump to 5 if you want to be ultra-safe
    if (framesSinceReadyRef.current >= 2) {
      hasCapturedRef.current = true;

      gl.domElement.toBlob((blob) => {
        if (!blob || !onScreenshotReady) {
          if (!blob) console.warn('❌ Failed to capture screenshot: no blob');
          return;
        }
        console.log('📸 Screenshot captured after render frames');
        onScreenshotReady(blob);
      }, 'image/png');
    }
  });

  // Clean up GLTF cache when this specific URL is no longer used
  useEffect(() => {
    return () => {
      // Remove only this GLTF from the cache, DO NOT clear the scene manually
      try {
        useGLTF.clear(url);
      } catch {
        // ignore if already cleared
      }
    };
  }, [url]);

  const hasMetallicTheme = useMemo(
	  () => theme === 'Metallic',
	  [theme]
	);
  
  return (
    <>
      <color attach="background" args={["white"]} />

        <ambientLight intensity={0.25} />
		{hasMetallicTheme ? (
			<directionalLight
				position={[10, 20, 0]}
				intensity={1.2}
				castShadow
				color="white"
				/>
			) : (
				<directionalLight castShadow position={[5, 5, 5]} intensity={0.2} />
			)
		}

        <spotLight
          position={[0, 15, 10]}
          angle={0.3}
          penumbra={0.8}
          intensity={0.8}
          castShadow
        />
		{!hasMetallicTheme && <Environment preset="lobby" background={false} />}
		
		<Model
			key={`model-${category}-${url}`}
			url={url}
			visible={true}
			category={category}
			selectedEntity={null}
			hiddenIds={new Set()}
			onLoad={handleModelLoad}
			combinedCenter={combinedCenter ?? new THREE.Vector3()}
			// theme will be wired up below
			theme={theme}
		/>
    </>
  );
};

interface ScreenshotViewerProps {
	scaffoldId?: number;
	category?: number;
	onScreenshotReady?: (blob: Blob) => void;
	theme?: 'Metallic' | 'Sunset';
}

const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({ scaffoldId: propId, category: propCategory, onScreenshotReady, theme='Sunset' }) => {
	const { scaffoldId: paramId } = useParams<{ scaffoldId: string }>();
	const [searchParams] = useSearchParams();
	const { domainStore } = useStore();
	const [localMeshUrl, setLocalMeshUrl] = useState<string | null>(null);

	const categoryFromQuery = parseInt(searchParams.get("category") ?? "0");
	const resolvedId = propId ?? (paramId ? parseInt(paramId) : undefined);
	const resolvedCategory = propCategory ?? categoryFromQuery;
	const isRouteMode = !propId;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	
	// const hasFetched = useRef(false);

	useEffect(() => {
		if (!resolvedId) return;

		let activeUrl: string | null = null;
		let cancelled = false;

		(async () => {
			try {
			const { blobUrl } = await domainStore.fetchMeshForScreenshot(resolvedId, resolvedCategory);
			if (cancelled) return;
			activeUrl = blobUrl;
			setLocalMeshUrl(blobUrl);
			} catch (e) {
			console.error("Failed to load mesh for screenshot:", e);
			}
		})();

		return () => {
			cancelled = true;
			if (activeUrl) {
			URL.revokeObjectURL(activeUrl);
			try {
				useGLTF.clear(activeUrl);
			} catch { /* ignore */ }
			}
			setLocalMeshUrl(null);
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
					<ScreenshotScene url={localMeshUrl} category={resolvedCategory} onScreenshotReady={onScreenshotReady} theme={theme}/>
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

