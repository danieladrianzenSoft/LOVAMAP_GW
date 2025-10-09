import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { DomainMetadata } from "../../app/models/domainMetadata";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import { toJS } from "mobx";

interface Props {
  selectedDomainEntity: { id: string; mesh: THREE.Mesh } | null;
  onUnselect: () => void;
  domainCategory: number;
  domainMetadata?: DomainMetadata | null;
  scaffoldGroup?: ScaffoldGroup | null;
}

const SelectedPanel: React.FC<Props> = ({
  selectedDomainEntity,
  onUnselect,
  domainMetadata,
  scaffoldGroup,
  domainCategory
}) => {

  const title = `Selected ${domainCategory === 0 ? "Particle" : "Pore"}`;
  const domainEntityId = selectedDomainEntity?.id?.toString() ?? null;
  const [showMore, setShowMore] = useState(false);

  // For particles
  const particleIndex =
    domainEntityId && domainMetadata?.id_to_index && Number.isInteger(domainMetadata.id_to_index[domainEntityId])
      ? domainMetadata.id_to_index[domainEntityId]
      : undefined;
  const particleDiameter =
    particleIndex !== undefined && scaffoldGroup?.inputs?.sizeDistribution
      ? scaffoldGroup.inputs.sizeDistribution[particleIndex]
      : undefined;

  // For pores
  const poreMetadata =
    domainEntityId && domainMetadata?.metadata ? domainMetadata.metadata[domainEntityId] : undefined;

  // useEffect(() => {
  //   if (selectedDomainEntity) {
  //     console.log("🔎 domainMetadata:", toJS(domainMetadata));
  //     console.log("🔎 Selected ID:", domainEntityId);
  //     console.log("🔎 ParticleIndex:", particleIndex);
  //     console.log("🔎 ParticleDiameter:", particleDiameter);
  //     console.log("🔎 PoreMetadata:", poreMetadata);
  //   }
  // }, [selectedDomainEntity, domainMetadata, particleIndex, particleDiameter, poreMetadata, domainEntityId]);

  return (
    <div className="mt-2 bg-white bg-opacity-80 shadow-lg rounded-lg p-4 w-64 transition-all duration-300">
      <div className="flex justify-between items-center cursor-pointer border-b border-gray-300 pb-2">
        <h2 className="text-sm font-semibold text-gray-800">{`${title}`}</h2>
        <button
          className="text-blue-600 hover:text-blue-800 text-xs"
          onClick={() => { if (selectedDomainEntity) onUnselect(); }}
          disabled={!selectedDomainEntity}
        >
          Unselect
        </button>
      </div>

      <div className="mt-2 text-sm text-gray-700 max-h-40 overflow-y-auto">
        {selectedDomainEntity ? (
          <>
            {/* Particle Display */}
            {domainCategory === 0 && (
              <div className="text-sm text-gray-700">
                {/* <p><span className="font-semibold">Diameter:</span> {Number.isFinite(particleDiameter) ? particleDiameter.toFixed(0) : particleDiameter} um</p> */}
                <p><span className="font-semibold">ID:</span> {selectedDomainEntity.id}</p>
              </div>
            )}

            {/* Pore Display */}
            {domainCategory !== 0 && poreMetadata && (
              <>
                <div className="text-sm text-gray-700 space-y-1">
                  {typeof poreMetadata.volume === "number" && (
                    <p><span className="font-semibold">Volume (pL):</span> {poreMetadata.volume.toFixed(2)}</p>
                  )}
                  {typeof poreMetadata.surfArea === "number" && (
                    <p><span className="font-semibold">Surface Area (μm²/1000):</span> {poreMetadata.surfArea.toFixed(2)}</p>
                  )}
                  {typeof poreMetadata.charLength === "number" && (
                    <p><span className="font-semibold">Aspect Ratio:</span> {poreMetadata.charLength.toFixed(2)}</p>
                  )}
                  {typeof poreMetadata.avgDoorDiam === "number" && (
                    <p><span className="font-semibold">Avg Door Diam (µm):</span> {poreMetadata.avgDoorDiam.toFixed(2)}</p>
                  )}
                  {typeof poreMetadata.largestDoorDiam === "number" && (
                    <p><span className="font-semibold">Largest Door Diam (µm):</span> {poreMetadata.largestDoorDiam.toFixed(2)}</p>
                  )}
                </div>
                <div className="flex justify-start items-start pb-2 mt-2">
                  <button
                    className="text-blue-600 hover:text-blue-800 text-xs"
                    onClick={() => setShowMore(!showMore)}
                  >
                    {`${showMore ? 'Hide' : 'Show more'}`}
                  </button>
                </div>
                {showMore && (
                  <div className="text-sm text-gray-700 space-y-1 mt-1">
                    <p><span className="font-semibold">ID:</span> {selectedDomainEntity.id}</p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          // Placeholder when nothing selected
          <div className="text-sm text-gray-500 italic">
            None selected
          </div>
        )}
      </div>

      {/* <div className="mt-2 text-sm text-gray-700 max-h-40 overflow-y-auto">
        <p>
          <span className="font-semibold">ID:</span> {selectedDomainEntity.id}
        </p>
      </div> */}

      {/* Particle Display */}
      {/* {domainCategory === 0 && particleDiameter !== undefined && (
        <div className="mt-2 text-sm text-gray-700">
          <p>
            <span className="font-semibold">Diameter:</span> {particleDiameter.toFixed(0)} um
          </p>
        </div>
      )} */}

      {/* Pore Display */}
      {/* {domainCategory !== 0 && poreMetadata && (
        <div className="mt-2 text-sm text-gray-700 space-y-1">
          {poreMetadata.volume !== undefined && (
            <p><span className="font-semibold">Volume:</span> {poreMetadata.volume.toFixed(2)}</p>
          )}
          {poreMetadata.surfArea !== undefined && (
            <p><span className="font-semibold">Surface Area:</span> {poreMetadata.surfArea.toFixed(2)}</p>
          )}
          {poreMetadata.charLength !== undefined && (
            <p><span className="font-semibold">Aspect Ratio:</span> {poreMetadata.charLength.toFixed(2)}</p>
          )}
          {poreMetadata.avgDoorDiam !== undefined && (
            <p><span className="font-semibold">Avg Door Diam:</span> {poreMetadata.avgDoorDiam.toFixed(2)}</p>
          )}
          {poreMetadata.largestDoorDiam !== undefined && (
            <p><span className="font-semibold">Largest Door Diam:</span> {poreMetadata.largestDoorDiam.toFixed(2)}</p>
          )} */}
          {/* {poreMetadata.edge !== undefined && (
            <p><span className="font-semibold">Edge:</span> {poreMetadata.edge ? "Yes" : "No"}</p>
          )}
          {poreMetadata.beadNeighbors !== undefined && (
            <p><span className="font-semibold">Bead Neighbors:</span> {poreMetadata.beadNeighbors.join(", ")}</p>
          )} */}
        {/* </div>
      )} */}
    </div>
  );
};

export default SelectedPanel;