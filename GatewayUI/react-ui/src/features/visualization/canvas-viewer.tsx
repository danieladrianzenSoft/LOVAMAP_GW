import React, { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, OrbitControls, useProgress } from "@react-three/drei";
import { PCFSoftShadowMap} from "three";
import * as THREE from "three";
import Model from "./model";
import { CANVAS_CAMERA_PROPS, applyCameraFraming } from "./camera-config";

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
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

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
  const [editingAxis, setEditingAxis] = useState<'x' | 'y' | 'z' | null>(null);
  const [editValue, setEditValue] = useState('');
  const editingRef = useRef(false);

  const applyEdit = useCallback((axis: 'x' | 'y' | 'z', val: string) => {
    if (!controlsRef.current) return;
    const n = parseFloat(val);
    if (isNaN(n)) return;
    const camera = controlsRef.current.object;
    const pos = camera.position.clone();
    pos[axis] = n;
    camera.position.copy(pos);
    camera.updateProjectionMatrix();
    controlsRef.current.update();
  }, [controlsRef]);

  const handleBlur = (axis: 'x' | 'y' | 'z') => {
    applyEdit(axis, editValue);
    setEditingAxis(null);
    editingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent, axis: 'x' | 'y' | 'z') => {
    if (e.key === 'Enter') { applyEdit(axis, editValue); setEditingAxis(null); editingRef.current = false; }
    if (e.key === 'Escape') { setEditingAxis(null); editingRef.current = false; }
  };

  const startEdit = (axis: 'x' | 'y' | 'z') => {
    editingRef.current = true;
    setEditValue(livePos[axis].toString());
    setEditingAxis(axis);
  };

  return (
    <div
      className="absolute bottom-4 z-10 select-none left-8 md:left-8 max-md:right-6 max-md:left-auto flex flex-col items-center"
      onMouseDown={e => e.stopPropagation()}
    >
      <AxesIndicator controlsRef={controlsRef} />
      <div
        className="flex gap-1 mt-0.5 font-mono leading-none text-gray-400"
        style={{ fontSize: '10px' }}
      >
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} className="flex flex-col items-center tabular-nums">
            <span className="uppercase">{axis}</span>
            {editingAxis === axis ? (
              <input
                autoFocus
                type="number"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => handleBlur(axis)}
                onKeyDown={e => handleKeyDown(e, axis)}
                className="w-10 bg-transparent border-b border-gray-300 font-mono text-gray-500 text-center outline-none px-0 py-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{ fontSize: '10px' }}
              />
            ) : (
              <span
                className="cursor-text hover:text-gray-500 transition-colors"
                onClick={() => startEdit(axis)}
              >{Math.abs(livePos[axis]) >= 100 ? Math.round(livePos[axis]) : livePos[axis].toFixed(1)}</span>
            )}
          </div>
        ))}
      </div>
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
                colorOverrideMap={meshProps.colorOverrideMap}
                onEntityIdsLoaded={meshProps.onEntityIdsLoaded}
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
