import React, { Component, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { PCFSoftShadowMap } from "three";
import Model from './model';
import { useParams, useSearchParams } from 'react-router-dom';
import { observer } from "mobx-react-lite";
import * as THREE from "three";
import { useStore } from "../../app/stores/store";
import { CANVAS_CAMERA_PROPS, applyCameraFraming } from "./camera-config";
import { ImageCategory } from "../../app/models/image";
import agent from "../../app/api/agent";
import { DomainMetadata } from "../../app/models/domainMetadata";

// Camera-following directional light (matches canvas-viewer)
const CamLight: React.FC = () => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  useFrame(({ camera }) => {
    if (lightRef.current) {
      lightRef.current.position.copy(camera.position);
    }
  });
  return <directionalLight ref={lightRef} intensity={1} castShadow color="white" />;
};

/** Configuration for a single mesh to render in the screenshot scene. */
interface MeshRenderConfig {
  url: string;
  category: number;       // Domain category (0 = particles, 1 = pores)
  hiddenIds: Set<string>;
  dimmed: boolean;
  dimmedOptions?: { color?: string; opacity?: number };
  slicingActive?: boolean;
}

/** Extract the set of edge-pore IDs from domain metadata. */
function computeEdgePoreIds(metadata: DomainMetadata | null | undefined): Set<string> {
  const edgeIds = new Set<string>();
  if (!metadata?.metadata) return edgeIds;
  Object.entries(metadata.metadata).forEach(([id, meta]) => {
    if (typeof meta === "object" && meta && "edge" in meta && (meta as any).edge === 1) {
      edgeIds.add(id);
    }
  });
  return edgeIds;
}

interface ScreenshotSceneProps {
  meshConfigs: MeshRenderConfig[];
  onScreenshotReady?: (blob: Blob) => void;
}

const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({
  meshConfigs,
  onScreenshotReady,
}) => {
  const { camera, scene, gl } = useThree();
  const hasCapturedRef = useRef(false);
  const framesSinceReadyRef = useRef(0);
  const loadedBoundsRef = useRef<Map<number, THREE.Box3>>(new Map());
  const [allModelsLoaded, setAllModelsLoaded] = useState(false);
  const [sliceThreshold, setSliceThreshold] = useState<number | null>(null);
  const needsSlicing = meshConfigs.some(c => c.slicingActive);
  const [combinedCenter] = useState(() => new THREE.Vector3(0, 0, 0));

  const handleModelLoad = useCallback((
    _loadedObject: THREE.Object3D,
    _center: THREE.Vector3,
    _size: number,
    category: number,
    bounds: { min: THREE.Vector3; max: THREE.Vector3 }
  ) => {
    loadedBoundsRef.current.set(
      category,
      new THREE.Box3(bounds.min.clone(), bounds.max.clone()),
    );

    if (loadedBoundsRef.current.size >= meshConfigs.length) {
      // All models loaded — compute combined bounding box and frame camera
      const combined = new THREE.Box3();
      loadedBoundsRef.current.forEach(b => combined.union(b));
      const sizeVec = combined.getSize(new THREE.Vector3());
      const totalSize = sizeVec.length();
      const totalCenter = combined.getCenter(new THREE.Vector3());

      // Center models at origin so camera framing is symmetric
      scene.position.set(-totalCenter.x, -totalCenter.y, -totalCenter.z);
      // Flush the new scene position into all world matrices NOW so that
      // Model's visibility useEffect (which runs before the next render
      // frame) computes correct world-space positions for slicing.
      scene.updateMatrixWorld(true);
      applyCameraFraming(camera, new THREE.Vector3(0, 0, 0), totalSize);

      // For HalfHalf: compute particle slice threshold at midpoint (in world space)
      const particleSlicing = meshConfigs.find(c => c.category === 0 && c.slicingActive);
      if (particleSlicing) {
        const particleBounds = loadedBoundsRef.current.get(0);
        if (particleBounds) {
          const origMidX = (particleBounds.min.x + particleBounds.max.x) / 2;
          setSliceThreshold(origMidX - totalCenter.x);
        }
      }

      setAllModelsLoaded(true);
    }
  }, [meshConfigs, camera, scene]);

  // Only allow screenshot capture once models are loaded AND the slice
  // threshold has propagated (if slicing is needed). This prevents the
  // race where the screenshot fires before Model applies the slice.
  const readyForScreenshot = allModelsLoaded && (!needsSlicing || sliceThreshold !== null);

  // Reset frame counter each time we become ready
  useEffect(() => {
    if (readyForScreenshot) {
      framesSinceReadyRef.current = 0;
    }
  }, [readyForScreenshot]);

  // Wait for render frames after fully ready, then capture.
  // useFrame runs BEFORE R3F's own gl.render(), so toBlob() would
  // normally capture the previous frame.  We force an explicit render
  // right before capture to guarantee the framebuffer is fresh.
  useFrame(() => {
    if (!readyForScreenshot || hasCapturedRef.current) return;
    framesSinceReadyRef.current += 1;

    // 20 frames gives Model's visibility useEffect time to apply
    // slicing + hidden IDs, and the GPU time to compile shaders and
    // upload geometry — especially for small meshes that load fast.
    if (framesSinceReadyRef.current >= 20) {
      hasCapturedRef.current = true;

      // Guard against WebGL context loss (can happen under memory pressure
      // during batch processing).
      if (gl.getContext().isContextLost()) {
        console.warn('WebGL context lost — skipping screenshot capture');
        onScreenshotReady?.(new Blob());  // empty blob signals failure
        return;
      }

      // Force a fresh render so the framebuffer has the latest state
      // (useFrame fires before R3F's own render pass).
      gl.render(scene, camera);

      gl.domElement.toBlob((blob) => {
        if (!blob || !onScreenshotReady) {
          if (!blob) console.warn('Failed to capture screenshot: no blob');
          return;
        }
        onScreenshotReady(blob);
      }, 'image/png');
    }
  });

  // NOTE: GLTF cache clearing is handled by ScreenshotViewer's deferred
  // cleanup (prevBlobUrlsRef).  Do NOT call useGLTF.clear() here — clearing
  // the cache while a fetch is still in-flight makes the promise rejection
  // unhandled, which triggers CRA's error overlay.

  return (
    <>
      <color attach="background" args={["white"]} />
      <ambientLight intensity={0.3} />
      <CamLight />

      {meshConfigs.map((config) => (
        <Model
          key={`model-${config.category}-${config.url}`}
          url={config.url}
          visible={true}
          category={config.category}
          selectedEntity={null}
          hiddenIds={config.hiddenIds}
          onLoad={handleModelLoad}
          combinedCenter={combinedCenter}
          dimmed={config.dimmed}
          dimmedOptions={config.dimmedOptions ?? { color: '#E7F6E3', opacity: 1 }}
          slicingActive={config.slicingActive}
          sliceXThreshold={config.slicingActive ? sliceThreshold : undefined}
        />
      ))}
    </>
  );
};

/**
 * Error boundary to catch GLTF loading failures (revoked blob URLs, network
 * errors, etc.) and prevent CRA's full-screen error overlay.
 */
class GLTFErrorBoundary extends Component<
  { children: React.ReactNode; onError?: (error: unknown) => void; resetKey?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[GLTFErrorBoundary] Caught GLTF error:', error.message);
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: { resetKey?: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface ScreenshotViewerProps {
	scaffoldId?: number;
	category?: number;
	onScreenshotReady?: (blob: Blob) => void;
	onError?: (error: unknown) => void;
}

const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({ scaffoldId: propId, category: propCategory, onScreenshotReady, onError }) => {
	const { scaffoldId: paramId } = useParams<{ scaffoldId: string }>();
	const [searchParams] = useSearchParams();
	const { domainStore } = useStore();

	// Track mesh configs together with which scaffold they belong to,
	// so the Canvas never renders with stale configs from a previous scaffold.
	const [meshState, setMeshState] = useState<{
		scaffoldId: number;
		category: number;
		configs: MeshRenderConfig[];
	} | null>(null);

	// Blob URLs from previous scaffolds, kept alive until the next scaffold
	// starts loading (so in-flight GLTF fetches don't hit a revoked URL).
	const prevBlobUrlsRef = useRef<string[]>([]);

	const categoryFromQuery = parseInt(searchParams.get("category") ?? "0");
	const resolvedId = propId ?? (paramId ? parseInt(paramId) : undefined);
	const resolvedCategory = propCategory ?? categoryFromQuery;
	const isRouteMode = !propId;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const onErrorRef = useRef(onError);
	useEffect(() => { onErrorRef.current = onError; }, [onError]);

	// Only use mesh configs that match the current scaffold.
	// When resolvedId changes, this immediately becomes null (before effects
	// run), which prevents the Canvas from rendering with stale blob URLs.
	const activeMeshConfigs =
		meshState?.scaffoldId === resolvedId && meshState?.category === resolvedCategory
			? meshState.configs
			: null;

	useEffect(() => {
		if (!resolvedId) return;

		// Revoke previous scaffold's blob URLs after a short delay.
		// The old Canvas has already unmounted (activeMeshConfigs was null
		// during the preceding render), but Three.js's GLTF loader may
		// still have a queued fetch — especially under React StrictMode
		// which double-invokes effects.  A brief timeout lets those
		// stale fetches settle before the URLs become invalid.
		const staleUrls = prevBlobUrlsRef.current;
		prevBlobUrlsRef.current = [];
		if (staleUrls.length > 0) {
			setTimeout(() => {
				staleUrls.forEach(url => {
					try { useGLTF.clear(url); } catch { /* ignore */ }
					URL.revokeObjectURL(url);
				});
			}, 3000);
		}

		let cancelled = false;
		const urls: string[] = [];

		(async () => {
			try {
				const imageCategory = resolvedCategory as ImageCategory;

				if (imageCategory === ImageCategory.InteriorPores) {
					// Interior pores: load pore mesh + metadata, hide edge (exterior) pores
					const { blobUrl, domain } = await domainStore.fetchMeshForScreenshot(resolvedId, 1);
					urls.push(blobUrl);
					if (cancelled) { urls.forEach(u => URL.revokeObjectURL(u)); return; }

					const metadataResponse = await agent.Domains.getDomainMetadata(domain.id!);
					if (cancelled) { urls.forEach(u => URL.revokeObjectURL(u)); return; }

					const edgeIds = computeEdgePoreIds(metadataResponse.data);
					if (edgeIds.size === 0) {
						throw new Error(`No edge-pore metadata for scaffold ${resolvedId} — cannot generate interior pores screenshot`);
					}

					setMeshState({
						scaffoldId: resolvedId,
						category: resolvedCategory,
						configs: [{
							url: blobUrl,
							category: 1,
							hiddenIds: edgeIds,
							dimmed: false,
						}],
					});

				} else if (imageCategory === ImageCategory.HalfHalf) {
					// HalfHalf: particles sliced at midpoint + pores with edge pores hidden
					const [particles, pores] = await Promise.all([
						domainStore.fetchMeshForScreenshot(resolvedId, 0),
						domainStore.fetchMeshForScreenshot(resolvedId, 1),
					]);
					urls.push(particles.blobUrl, pores.blobUrl);
					if (cancelled) { urls.forEach(u => URL.revokeObjectURL(u)); return; }

					const metadataResponse = await agent.Domains.getDomainMetadata(pores.domain.id!);
					if (cancelled) { urls.forEach(u => URL.revokeObjectURL(u)); return; }

					const edgeIds = computeEdgePoreIds(metadataResponse.data);
					if (edgeIds.size === 0) {
						throw new Error(`No edge-pore metadata for scaffold ${resolvedId} — cannot generate half-half screenshot`);
					}

					console.log(`[HalfHalf] Setting up 2 meshes: particles=${particles.blobUrl.slice(-20)}, pores=${pores.blobUrl.slice(-20)}, edgeIds=${edgeIds.size}`);
					setMeshState({
						scaffoldId: resolvedId,
						category: resolvedCategory,
						configs: [
							{
								url: particles.blobUrl,
								category: 0,
								hiddenIds: new Set(),
								dimmed: true,
								dimmedOptions: { color: '#E7F6E3', opacity: 1 },
								slicingActive: true,
							},
							{
								url: pores.blobUrl,
								category: 1,
								hiddenIds: edgeIds,
								dimmed: false,
							},
						],
					});

				} else {
					// Simple case: Particles (0) or ExteriorPores (1)
					const { blobUrl } = await domainStore.fetchMeshForScreenshot(resolvedId, resolvedCategory);
					urls.push(blobUrl);
					if (cancelled) { urls.forEach(u => URL.revokeObjectURL(u)); return; }

					setMeshState({
						scaffoldId: resolvedId,
						category: resolvedCategory,
						configs: [{
							url: blobUrl,
							category: resolvedCategory,
							hiddenIds: new Set(),
							dimmed: resolvedCategory === 0,
							dimmedOptions: { color: '#E7F6E3', opacity: 1 },
						}],
					});
				}
			} catch (e) {
				urls.forEach(u => URL.revokeObjectURL(u));
				console.error("Failed to load mesh(es) for screenshot:", e);
				if (!cancelled && onErrorRef.current) onErrorRef.current(e);
			}
		})();

		return () => {
			cancelled = true;
			// Don't revoke blob URLs here — the GLTF loader may still have
			// in-flight fetches. Stash them so the next effect invocation
			// (or the unmount cleanup) can revoke them safely.
			prevBlobUrlsRef.current = [...prevBlobUrlsRef.current, ...urls];
			setMeshState(null);
		};
	}, [resolvedId, resolvedCategory, domainStore]);

	// Final cleanup: revoke any remaining blob URLs when the component
	// fully unmounts (e.g. batch is done, navigating away).
	useEffect(() => {
		return () => {
			const urls = prevBlobUrlsRef.current;
			prevBlobUrlsRef.current = [];
			// Generous delay so any in-flight GLTF fetches (including
			// React StrictMode double-invocations) complete before the
			// blob URLs become invalid.
			setTimeout(() => {
				urls.forEach(url => {
					try { useGLTF.clear(url); } catch { /* ignore */ }
					URL.revokeObjectURL(url);
				});
			}, 5000);
		};
	}, []);

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

	if (!resolvedId || !activeMeshConfigs) return null;

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
			<GLTFErrorBoundary
				resetKey={`${resolvedId}-${resolvedCategory}`}
				onError={onErrorRef.current}
			>
				<Canvas
					ref={canvasRef}
					key={`${resolvedId}-${resolvedCategory}`}
					shadows
					camera={CANVAS_CAMERA_PROPS}
					style={{ width: "512px", height: "512px" }}
					gl={{
						preserveDrawingBuffer: true,
						toneMapping: THREE.NoToneMapping,
						shadowMapType: PCFSoftShadowMap,
					}}
					onCreated={({ gl }) => {
						gl.shadowMap.enabled = true;
						gl.shadowMap.type = PCFSoftShadowMap;
					}}
				>
					<Suspense fallback={null}>
						<ScreenshotScene meshConfigs={activeMeshConfigs} onScreenshotReady={onScreenshotReady} />
					</Suspense>
				</Canvas>
			</GLTFErrorBoundary>

			{/* Screenshot button (only in route mode) */}
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
