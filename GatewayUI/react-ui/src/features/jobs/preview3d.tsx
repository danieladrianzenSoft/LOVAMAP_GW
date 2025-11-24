import React, { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Particle = {
  x: number;
  y: number;
  z: number;
  r: number;
};

type Preview3DProps = {
  file: File | null;
};

const isDatOrCsv = (file: File | null) => {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return name.endsWith(".dat") || name.endsWith(".csv");
};

const parseDatOrCsvText = (text: string): Particle[] => {
  const particles: Particle[] = [];

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue; // skip comments/headers

    const parts = line.split(/[\s,]+/).map(Number); // spaces or commas
    if (parts.length < 4 || parts.some((v) => Number.isNaN(v))) continue;

    const [x, y, z, r] = parts;
    particles.push({ x, y, z, r });
  }

  return particles;
};

export const Preview3D: React.FC<Preview3DProps> = ({ file }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Parse file whenever it changes
  useEffect(() => {
    let cancelled = false;

    const parseFile = async () => {
      setError(null);
      setParticles([]);

      if (!file) return;
      if (!isDatOrCsv(file)) {
        setError("Preview is currently only available for .dat or .csv files.");
        return;
      }

      setIsLoading(true);
      try {
        const text = await file.text();
        if (cancelled) return;

        const parsed = parseDatOrCsvText(text);
        if (!parsed.length) {
          setError("No valid particle data found in this file.");
          return;
        }

        setParticles(parsed);
      } catch (e: any) {
        if (!cancelled) setError(`Failed to parse file: ${e?.message ?? e}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    parseFile();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const particleCount = particles.length;

  return (
    <div className="mt-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-700">
          Geometry preview (pre-flight check)
        </h4>
        {file && (
          <span className="text-sm text-gray-500">
            File: {file.name} {particleCount ? `– ${particleCount} particles` : ""}
          </span>
        )}
      </div>

      <div className="border rounded-md bg-gray-50">
        {isLoading && (
          <div className="h-64 flex items-center justify-center text-sm text-gray-500">
            Parsing file and preparing preview…
          </div>
        )}

        {!isLoading && error && (
          <div className="h-64 flex items-center justify-center text-sm text-red-500 px-4 text-center">
            {error}
          </div>
        )}

        {!isLoading && !error && !particleCount && (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400 px-4 text-center">
            Select a .dat or .csv file to see a 3D preview of your scaffold.
          </div>
        )}

        {!isLoading && !error && particleCount > 0 && (
          <div className="h-96">
            <Canvas
              camera={{ position: [0, 0, 10], fov: 45 }}
              dpr={[1, 2]}
              className="rounded-md"
            >
              {/* Lights somewhat similar to your main viewer */}
              <ambientLight intensity={0.6} />
              <directionalLight position={[10, 10, 10]} intensity={0.8} />
              <directionalLight position={[-10, -10, -10]} intensity={0.3} />

              <InstancedSpheres particles={particles} />

              <OrbitControls makeDefault />
            </Canvas>
          </div>
        )}
      </div>
    </div>
  );
};

type InstancedSpheresProps = {
  particles: Particle[];
};

const InstancedSpheres: React.FC<InstancedSpheresProps> = ({ particles }) => {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();

  const { geometry, material } = useMemo(() => {
    const geom = new THREE.SphereGeometry(1, 16, 16); // radius 1; we scale
    const mat = new THREE.MeshStandardMaterial({
      metalness: 0.1,
      roughness: 0.4,
    });
    return { geometry: geom, material: mat };
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || particles.length === 0) return;

    // 1) Compute raw bounds in world coords
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    particles.forEach((p) => {
      const { x, y, z, r } = p;
      const rAbs = Math.abs(r);
      minX = Math.min(minX, x - rAbs);
      minY = Math.min(minY, y - rAbs);
      minZ = Math.min(minZ, z - rAbs);
      maxX = Math.max(maxX, x + rAbs);
      maxY = Math.max(maxY, y + rAbs);
      maxZ = Math.max(maxZ, z + rAbs);
    });

    const center = new THREE.Vector3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );
    const extent = new THREE.Vector3(
      maxX - minX,
      maxY - minY,
      maxZ - minZ
    );
    const maxExtent = Math.max(extent.x, extent.y, extent.z) || 1;

    // 2) Position instances *relative to center* (so scaffold is centered at origin)
    particles.forEach((p, i) => {
      const { x, y, z, r } = p;

      tempObject.position.set(
        x - center.x,
        y - center.y,
        z - center.z
      );
      tempObject.scale.setScalar(r); // base radius 1 → radius r
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;

    // 3) Frame camera around origin
    const distance = maxExtent * 1.8;
    camera.position.set(0, distance, distance * 1.2);
    camera.lookAt(0, 0, 0);
    camera.near = distance / 100; // keep near/far reasonable for big scenes
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
  }, [particles, tempObject, camera]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, particles.length]}
      castShadow={false}
      receiveShadow={false}
    />
  );
};
