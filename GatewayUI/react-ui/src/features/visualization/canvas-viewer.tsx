import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls, useProgress } from "@react-three/drei";
import { PCFSoftShadowMap } from "three";
import * as THREE from "three";
import Model from "./model";

interface DomainMeshProps {
  url: string;
  category: number;
  visible: boolean;
  hiddenIds: Set<string>;
  selectedEntity: { id: string; mesh: THREE.Mesh } | null;
  onEntityClick: (category: number, id: string, mesh: THREE.Mesh) => void;
  onEntityRightClick: (category: number, id: string, mesh: THREE.Mesh) => void;
  opacity?: number;
  color?: string;
  dimmed?: boolean;
  slicingActive?: boolean;
  sliceXThreshold?: number | null;
  dimmedOptions?: {
    color?: string;
    opacity?: number;
  };
  debugMode?: boolean;
}

interface CanvasViewerProps {
  meshes: DomainMeshProps[];
  theme?: "Metallic" | "Sunset";
  onSliceBoundsComputed?: (bounds: { min: THREE.Vector3; max: THREE.Vector3 }) => void;
  onCanvasCreated?: (canvas: HTMLCanvasElement) => void;
}

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

const CanvasViewer: React.FC<CanvasViewerProps> = ({
  meshes,
  theme,
  onSliceBoundsComputed,
  onCanvasCreated
}) => {

  const [combinedCenter] = useState<THREE.Vector3 | null>(null);
  const [, setParticleCenters] = useState<THREE.Vector3[]>([]);
  const [particleBounds, setParticleBounds] =
    useState<{ min: THREE.Vector3; max: THREE.Vector3 } | null>(null);

  const { active } = useProgress();
  const isLoaderActive = active;

  const controlsRef = useRef<any>(null);
  const hasSetCamera = useRef(false);

  const hasMetallicTheme = useMemo(
    () => theme === "Metallic",
    [theme]
  );

  const handleModelLoad = useCallback((
    scene: THREE.Object3D,
    center: THREE.Vector3,
    size: number,
    category: number,
    bounds: { min: THREE.Vector3; max: THREE.Vector3 }
  ) => {

    if (!controlsRef.current) return;

    if (category === 0 && bounds) {
      setParticleCenters([center]);
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
      {isLoaderActive && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="rounded-md bg-white bg-opacity-90 p-3 shadow">
            <div className="text-gray-700 text-sm">Rendering…</div>
          </div>
        </div>
      )}

      <Canvas
        shadows
        gl={{
          toneMapping: THREE.NoToneMapping,   // MATLAB-like
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = PCFSoftShadowMap;
          onCanvasCreated?.(gl.domElement);
        }}
      >
        <color attach="background" args={["white"]} />

        {/* MATLAB-like lighting */}
        <ambientLight intensity={0.3} />

        {hasMetallicTheme ? (
          <>
            <CamLight />  {/* camlight simulation */}
          </>
        ) : (
          <>
            <directionalLight
              position={[5, 5, 5]}
              intensity={0.6}
              castShadow
            />
            <Environment preset="lobby" background={false} />
          </>
        )}

        <Bounds>
          {meshes.map((meshProps, idx) => (
            <group key={meshProps.url ?? idx}>
              <Model
                key={idx}
                {...meshProps}
                combinedCenter={combinedCenter ?? new THREE.Vector3()}
                onLoad={handleModelLoad}
                theme={theme}
              />
            </group>
          ))}
        </Bounds>

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.1}
        />

      </Canvas>
    </>
  );
};

export default CanvasViewer;