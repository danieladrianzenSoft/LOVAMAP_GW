import React, { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, OrbitControls, useProgress } from "@react-three/drei";
import { PCFSoftShadowMap} from "three";
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
  diameterValues?: number[];
  idToIndex?: Record<string, number>;
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
  return <directionalLight ref={lightRef} intensity={1} castShadow color="white" />;
};

// 4/27 JacklynX changed - reads camera position and emits it so the overlay can display it
interface CameraTrackerProps {
  onPosChange: (x: number, y: number, z: number) => void;
}
const CameraTracker: React.FC<CameraTrackerProps> = ({ onPosChange }) => {
  useFrame(({ camera }) => {
    onPosChange(
      parseFloat(camera.position.x.toFixed(1)),
      parseFloat(camera.position.y.toFixed(1)),
      parseFloat(camera.position.z.toFixed(1)),
    );
  });
  return null;
};

// 4/27 JacklynX changed - SVG XYZ axis indicator that rotates with the camera
interface AxesIndicatorProps {
  controlsRef: React.RefObject<any>;
}
const AxesIndicator: React.FC<AxesIndicatorProps> = ({ controlsRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 80;
    canvas.width = size;
    canvas.height = size;

    const axes = [
      { dir: new THREE.Vector3(1, 0, 0), color: '#e74c3c', label: 'X' },
      { dir: new THREE.Vector3(0, 1, 0), color: '#2ecc71', label: 'Y' },
      { dir: new THREE.Vector3(0, 0, 1), color: '#3498db', label: 'Z' },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      if (!controlsRef.current) { animRef.current = requestAnimationFrame(draw); return; }

      const camera = controlsRef.current.object as THREE.Camera;
      const cx = size / 2, cy = size / 2, len = 28;

      // Project each axis direction using camera's view matrix
      const projected = axes.map(({ dir, color, label }) => {
        const v = dir.clone().applyQuaternion(camera.quaternion.clone().invert());
        return { x: cx + v.x * len, y: cy - v.y * len, color, label, z: v.z };
      }).sort((a, b) => a.z - b.z); // back to front

      // Draw background circle
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw axes back to front
      projected.forEach(({ x, y, color, label }) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(y - cy, x - cx);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7 * Math.cos(angle - 0.4), y - 7 * Math.sin(angle - 0.4));
        ctx.lineTo(x - 7 * Math.cos(angle + 0.4), y - 7 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Label
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + (x - cx) * 0.3, y + (y - cy) * 0.3);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [controlsRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 80, height: 80, display: 'block' }}
      title="XYZ axis orientation"
    />
  );
};

// 4/27 JacklynX changed - camera position overlay: SVG axes + coordinate inputs
interface CameraControlPanelProps {
  controlsRef: React.RefObject<any>;
  livePos: { x: number; y: number; z: number };
}

const CameraControlPanel: React.FC<CameraControlPanelProps> = ({ controlsRef, livePos }) => {
  const [inputs, setInputs] = useState({ x: '0', y: '0', z: '0' });
  const [open, setOpen] = useState(false);

  // Sync inputs from live camera position when not editing
  const editingRef = useRef(false);
  useEffect(() => {
    if (!editingRef.current) {
      setInputs({
        x: livePos.x.toString(),
        y: livePos.y.toString(),
        z: livePos.z.toString(),
      });
    }
  }, [livePos]);

  const handleChange = (axis: 'x' | 'y' | 'z', val: string) => {
    editingRef.current = true;
    setInputs(prev => ({ ...prev, [axis]: val }));
  };

  const handleApply = () => {
    if (!controlsRef.current) return;
    const x = parseFloat(inputs.x);
    const y = parseFloat(inputs.y);
    const z = parseFloat(inputs.z);
    if (isNaN(x) || isNaN(y) || isNaN(z)) return;
    const camera = controlsRef.current.object;
    camera.position.set(x, y, z);
    camera.updateProjectionMatrix();
    controlsRef.current.update();
    editingRef.current = false;
  };

  const handleBlur = () => { editingRef.current = false; };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { handleApply(); editingRef.current = false; } };

  return (
    <div
      className="absolute bottom-4 left-4 z-30 select-none"
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Always-visible axes indicator */}
      <div className="cursor-pointer" onClick={() => setOpen(o => !o)} title="Toggle camera XYZ inputs">
        <AxesIndicator controlsRef={controlsRef} />
      </div>

      {/* Expandable coordinate inputs */}
      {open && (
        <div
          className="mt-1 bg-white bg-opacity-95 border border-gray-200 rounded shadow-lg p-3 w-48"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="text-xs font-medium text-gray-600 mb-2">Camera Position</div>
          <div className="space-y-1.5">
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis} className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold w-3 uppercase" style={{
                  color: axis === 'x' ? '#e74c3c' : axis === 'y' ? '#2ecc71' : '#3498db'
                }}>{axis}</span>
                <input
                  type="number"
                  value={inputs[axis]}
                  onChange={e => handleChange(axis, e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { editingRef.current = true; }}
                  onBlur={handleBlur}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleApply}
            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs rounded py-1"
          >
            Apply
          </button>
          <p className="mt-1 text-xs text-gray-400 leading-tight">Click axes to toggle · Enter to apply</p>
        </div>
      )}
    </div>
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
  const [livePos, setLivePos] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (!particleBounds || !onSliceBoundsComputed) return;
    onSliceBoundsComputed({ min: particleBounds.min.clone(), max: particleBounds.max.clone() });
  }, [particleBounds, onSliceBoundsComputed]);

  const handleModelLoad = useCallback((scene: THREE.Object3D, center: THREE.Vector3, size: number, category: number, bounds: { min: THREE.Vector3; max: THREE.Vector3 }) => {
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
        gl={{
          preserveDrawingBuffer: true,
          toneMapping: THREE.NoToneMapping,
          shadowMapType: PCFSoftShadowMap,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = PCFSoftShadowMap;
          onCanvasCreated?.(gl.domElement);
        }}
      >
        <color attach="background" args={["white"]} />
        <ambientLight intensity={0.3} />
        <CamLight />
        <CameraTracker onPosChange={(x, y, z) => setLivePos({ x, y, z })} />
        <Bounds>
          {meshes.map((meshProps, idx) => (
            <group key={meshProps.url ?? idx}>
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
              />
            </group>
          ))}
        </Bounds>
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.1}/>
      </Canvas>

      {/* 4/27 JacklynX changed - SVG axes indicator + coordinate inputs, bottom-left */}
      <CameraControlPanel controlsRef={controlsRef} livePos={livePos} />
    </>
  );
};

export default CanvasViewer;
