import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls, useProgress } from "@react-three/drei";
import { ACESFilmicToneMapping, PCFSoftShadowMap} from "three";
import * as THREE from "three";
import Model from "./model"; // assuming this stays in the same folder

interface DomainMeshProps {
  url: string;
  category: number; // 0 = particles, 1 = pores
  visible: boolean;
  hiddenIds: Set<string>;
  selectedEntity: { id: string; mesh: THREE.Mesh } | null;
  onEntityClick: (category: number, id: string, mesh: THREE.Mesh) => void;
  onEntityRightClick: (category: number, id: string, mesh: THREE.Mesh) => void;
  opacity?: number;                     // Independent opacity control
	color?: string;                       // Independent base color (optional)
	dimmed?: boolean;                     // Whether to apply dimming override
  slicingActive?: boolean;
  sliceXThreshold?: number | null;
	dimmedOptions?: {
		color?: string;                   // Default: '#f2f3f4'
		opacity?: number;                // Default: 0.1
	};
  debugMode?: boolean;
}

interface CanvasViewerProps {
  meshes: DomainMeshProps[];
  theme?: 'Metallic' | 'Sunset';
  onSliceBoundsComputed?: (bounds: { min: THREE.Vector3; max: THREE.Vector3 }) => void;
  onCanvasCreated?: (canvas: HTMLCanvasElement) => void;
}

const CanvasViewer: React.FC<CanvasViewerProps> = ({ meshes, theme, onSliceBoundsComputed, onCanvasCreated }) => {
  // const [centers, setCenters] = useState<THREE.Vector3[]>([]);
  const [combinedCenter, ] = useState<THREE.Vector3 | null>(null);
  const [, setParticleCenters] = useState<THREE.Vector3[]>([]);
  const [particleBounds, setParticleBounds] = useState<{ min: THREE.Vector3; max: THREE.Vector3 } | null>(null);
  const { active } = useProgress();
  const isLoaderActive = active;
  const [loadingCount, setLoadingCount] = useState(0);
  const incrementLoading = useCallback(() => setLoadingCount(c => c + 1), []);
  const decrementLoading = useCallback(() => setLoadingCount(c => Math.max(0, c - 1)), []);

  const controlsRef = useRef<any>(null);
  const hasSetCamera = useRef(false);

  useEffect(() => {
    if (!particleBounds || !onSliceBoundsComputed) return;

    const min = particleBounds.min.clone();
    const max = particleBounds.max.clone();

    onSliceBoundsComputed({ min, max });
  }, [particleBounds, onSliceBoundsComputed]);

  // const globalOffset = useMemo(() => {
  //   return particleCenters.length
  //     ? particleCenters.reduce((acc, c) => acc.clone().add(c), new THREE.Vector3()).divideScalar(particleCenters.length)
  //     : new THREE.Vector3();
  // }, [particleCenters]);

  const handleModelLoad = useCallback((scene: THREE.Object3D, center: THREE.Vector3, size: number, category: number, bounds: { min: THREE.Vector3; max: THREE.Vector3 }) => {
    if (!controlsRef.current) return;

    if (category === 0 && bounds) {
      setParticleCenters([center]); // optional, still useful for camera
      setParticleBounds(bounds);
    }

    if (hasSetCamera.current) return;

    const direction = new THREE.Vector3(0.9, 0.5, 0.8).normalize();
    const distance = size * 0.8;
    const newPosition = direction.multiplyScalar(distance).add(center);

    const camera = controlsRef.current.object;
    camera.position.copy(newPosition);
    camera.lookAt(center);
    camera.near = size / 10;
    camera.far = size * 10;
    camera.updateProjectionMatrix();

    controlsRef.current.target.copy(center);
    controlsRef.current.update();

    hasSetCamera.current = true;
  }, []);

  const hasMetallicTheme = useMemo(
    () => theme === 'Metallic',
    [theme]
  );

  const isRendering = isLoaderActive || loadingCount > 0;

  return (
    <>
      {/* {isLoading && <div className="text-gray-600">Loading mesh...</div>} */}
      {isRendering && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="rounded-md bg-white bg-opacity-90 p-3 shadow">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <div className="text-gray-700 text-sm">Rendering…</div>
            </div>
          </div>
        </div>
      )}
      <Canvas
        shadows
        gl={{
          preserveDrawingBuffer: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          shadowMapType: PCFSoftShadowMap,
        }}
        onCreated={({ gl }) => {
          onCanvasCreated?.(gl.domElement);
        }}
      >
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
        {/* <Environment preset="lobby" background={false} /> */}
        {!hasMetallicTheme && <Environment preset="lobby" background={false} />}
        {/* {theme !== 'Metallic' && <Environment preset="studio" background={false} />} */}
        <Bounds>
          {meshes.map((meshProps, idx) => (
            <group 
              key={meshProps.url ?? idx}
              // position={centers[idx] ? centers[idx].clone().sub(globalOffset) : [0, 0, 0]}
            >
              {meshProps.debugMode && <axesHelper args={[100]} />}
              <Model
                key={idx}
                url={meshProps.url}
                category={meshProps.category}
                visible={meshProps.visible}
                hiddenIds={meshProps.hiddenIds}
                selectedEntity={meshProps.selectedEntity}
                combinedCenter={combinedCenter ?? new THREE.Vector3()}
                onEntityClick={meshProps.onEntityClick}
                onEntityRightClick={meshProps.onEntityRightClick}
                opacity={meshProps.opacity}
                color={meshProps.color}
                dimmed={meshProps.dimmed ?? false}
                dimmedOptions={meshProps.dimmedOptions}
                debugMode={meshProps.debugMode}
                onLoad={handleModelLoad}
                slicingActive={meshProps.slicingActive}
                sliceXThreshold={meshProps.sliceXThreshold}
                theme={theme}
              />
            </group>
          ))}
        </Bounds>
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.1}/>
      </Canvas>
    </>
  );
};

export default CanvasViewer;