import React, { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, OrbitControls, useProgress } from "@react-three/drei";
import { PCFSoftShadowMap} from "three";
import * as THREE from "three";
import Model from "./model";
import { CANVAS_CAMERA_PROPS, applyCameraFraming } from "./camera-config";

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
  diameterValues?: number[];
  idToIndex?: Record<string, number>;
  colorOverrideMap?: Record<string, string> | null;
  onEntityIdsLoaded?: (ids: string[]) => void;
}

interface CanvasViewerProps {
  meshes: DomainMeshProps[];
  onSliceBoundsComputed?: (bounds: { min: THREE.Vector3; max: THREE.Vector3 }) => void;
  onCanvasCreated?: (canvas: HTMLCanvasElement) => void;
}

// JX: camera-following directional light for MATLAB-like lighting
const CamLight: React.FC = () => {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(({ camera }) => {
    if (lightRef.current) {
      lightRef.current.position.copy(camera.position);
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={1}
      castShadow
      color="white"
    />
  );
};

const CanvasViewer: React.FC<CanvasViewerProps> = ({ meshes, onSliceBoundsComputed, onCanvasCreated }) => {
  const [combinedCenter, ] = useState<THREE.Vector3 | null>(null);
  const [, setParticleCenters] = useState<THREE.Vector3[]>([]);
  const [particleBounds, setParticleBounds] = useState<{ min: THREE.Vector3; max: THREE.Vector3 } | null>(null);
  const { active } = useProgress();
  const isLoaderActive = active;
  const [loadingCount, ] = useState(0);

  const controlsRef = useRef<any>(null);
  const hasSetCamera = useRef(false);

  useEffect(() => {
    if (!particleBounds || !onSliceBoundsComputed) return;

    const min = particleBounds.min.clone();
    const max = particleBounds.max.clone();

    onSliceBoundsComputed({ min, max });
  }, [particleBounds, onSliceBoundsComputed]);

  const handleModelLoad = useCallback((scene: THREE.Object3D, center: THREE.Vector3, size: number, category: number, bounds: { min: THREE.Vector3; max: THREE.Vector3 }) => {
    if (!controlsRef.current) return;

    if (category === 0 && bounds) {
      setParticleCenters([center]);
      setParticleBounds(bounds);
    }

    if (hasSetCamera.current) return;

    applyCameraFraming(controlsRef.current.object, center, size);

    controlsRef.current.target.copy(center);
    controlsRef.current.update();

    hasSetCamera.current = true;
  }, []);

  const isRendering = isLoaderActive || loadingCount > 0;

  return (
    <>
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
        camera={CANVAS_CAMERA_PROPS}
        gl={{
          preserveDrawingBuffer: true,
          toneMapping: THREE.NoToneMapping,   // JX: MATLAB-like
          shadowMapType: PCFSoftShadowMap,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = PCFSoftShadowMap;
          onCanvasCreated?.(gl.domElement);
        }}
      >
        <color attach="background" args={["white"]} />

        {/* JX: MATLAB-like lighting */}
        <ambientLight intensity={0.3} />
        <CamLight />

        <Bounds>
          {meshes.map((meshProps, idx) => (
            <group
              key={meshProps.url ?? idx}
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
                diameterValues={meshProps.diameterValues}
                idToIndex={meshProps.idToIndex}
                colorOverrideMap={meshProps.colorOverrideMap}
                onEntityIdsLoaded={meshProps.onEntityIdsLoaded}
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
