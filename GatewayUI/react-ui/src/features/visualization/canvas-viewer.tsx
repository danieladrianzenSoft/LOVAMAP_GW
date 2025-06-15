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
  onSliceBoundsComputed?: (bounds: { min: THREE.Vector3; max: THREE.Vector3 }) => void;
}

const CanvasViewer: React.FC<CanvasViewerProps> = ({ meshes, onSliceBoundsComputed }) => {
  const [centers, setCenters] = useState<THREE.Vector3[]>([]);
  const [combinedCenter, setCombinedCenter] = useState<THREE.Vector3 | null>(null);
  const [particleCenters, setParticleCenters] = useState<THREE.Vector3[]>([]);
  const [particleBounds, setParticleBounds] = useState<{ min: THREE.Vector3; max: THREE.Vector3 } | null>(null);
  const { active } = useProgress();
  const isLoading = active;

  const controlsRef = useRef<any>(null);
  const hasSetCamera = useRef(false); // ✅ only allow camera to be set once

  useEffect(() => {
    if (!particleBounds || !onSliceBoundsComputed) return;

    const min = particleBounds.min.clone();
    const max = particleBounds.max.clone();

    onSliceBoundsComputed({ min, max });
  }, [particleBounds, onSliceBoundsComputed]);

  const globalOffset = useMemo(() => {
    return particleCenters.length
      ? particleCenters.reduce((acc, c) => acc.clone().add(c), new THREE.Vector3()).divideScalar(particleCenters.length)
      : new THREE.Vector3();
  }, [particleCenters]);

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

  return (
    <>
      {isLoading && <div className="text-gray-600">Loading mesh...</div>}
      <Canvas
        shadows
        gl={{
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          shadowMapType: PCFSoftShadowMap,
        }}
      >
        <color attach="background" args={["white"]} />
        <ambientLight intensity={0.2} />
        <directionalLight castShadow position={[5, 5, 5]} intensity={0.2} />
        <spotLight
          position={[0, 15, 10]}
          angle={0.3}
          penumbra={0.8}
          intensity={0.8}
          castShadow
        />
        <Environment preset="lobby" background={false} />
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