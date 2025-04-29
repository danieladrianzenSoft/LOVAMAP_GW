import React from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls, useProgress } from "@react-three/drei";
import { ACESFilmicToneMapping, PCFSoftShadowMap} from "three";
import * as THREE from "three";
import Model from "./model"; // assuming this stays in the same folder
import { HistoryAction } from "../../app/models/historyAction";


interface Props {
	domainMeshUrl: string,
	hiddenParticles: Set<string>;
	selectedParticle: { id: string; mesh: THREE.Mesh } | null;
	onParticleClick: (id: string, mesh: THREE.Mesh) => void;
	onParticleRightClick: (id: string, mesh: THREE.Mesh) => void;
	setHistory: React.Dispatch<React.SetStateAction<HistoryAction[]>>;
}

const CanvasViewer: React.FC<Props> = ({
  domainMeshUrl,
  hiddenParticles,
  selectedParticle,
  onParticleClick,
  onParticleRightClick,
  setHistory,
}) => {
  // const { active } = useProgress();
  // const [meshReady, setMeshReady] = useState(false);
  const { active } = useProgress();

  const isLoading = active;

  // useEffect(() => {
  //   setMeshReady(false);
  // }, [domainMeshUrl]);
  
  return (
    <>
      {isLoading && (
        <div className="text-gray-600">
          Loading mesh...
        </div>
      )}
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
          <Model
            url={domainMeshUrl}
            // onLoad={() => setMeshReady(true)}
            onParticleClick={onParticleClick}
            onParticleRightClick={onParticleRightClick}
            hiddenParticles={hiddenParticles}
            selectedParticle={selectedParticle}
            setHistory={setHistory}
          />
        </Bounds>
        <OrbitControls enableDamping={true} dampingFactor={0.1} target={[0, 0, 0]}/>
      </Canvas>
      </>
  );
};

export default CanvasViewer;
