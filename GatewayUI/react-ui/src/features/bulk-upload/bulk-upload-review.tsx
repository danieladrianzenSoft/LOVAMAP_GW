import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { BulkUploadStep, FileRole, ScaffoldSlot } from "./bulk-upload-types";

type SlotField = "particleMesh" | "poreMesh" | "particleMetadata" | "poreMetadata";

const SLOT_COLUMNS: { field: SlotField; label: string; acceptRoles: FileRole[] }[] = [
  { field: "particleMesh", label: "Particle Mesh", acceptRoles: [FileRole.ParticleMesh] },
  { field: "poreMesh", label: "Pore Mesh", acceptRoles: [FileRole.PoreMesh] },
  { field: "particleMetadata", label: "Particle Meta", acceptRoles: [FileRole.ParticleMetadata] },
  { field: "poreMetadata", label: "Pore Meta", acceptRoles: [FileRole.PoreMetadata] },
];

const BulkUploadReview: React.FC = () => {
  const { bulkUploadStore } = useStore();
  const { slots, unassignedFiles, descriptorFile } = bulkUploadStore;
  const [expandedUnassigned, setExpandedUnassigned] = useState(true);
  const [dragSource, setDragSource] = useState<{ unassignedIndex: number } | null>(null);

  const handleDragStart = (unassignedIndex: number) => {
    setDragSource({ unassignedIndex });
  };

  const handleDrop = (slotIndex: number, field: SlotField) => {
    if (!dragSource) return;
    bulkUploadStore.assignToSlot(slotIndex, field, dragSource.unassignedIndex);
    setDragSource(null);
  };

  const canContinue = slots.some((s) => s.particleMesh || s.poreMesh);

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Step 2: Review & Organize</h2>

      {/* Descriptor file */}
      <div className="mb-4 p-3 bg-gray-50 rounded border">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">Descriptors: </span>
            {descriptorFile ? (
              <span className="text-sm text-green-700" title={descriptorFile.file.name}>{descriptorFile.file.name}</span>
            ) : (
              <span className="text-sm text-yellow-600">None detected</span>
            )}
          </div>
          {descriptorFile && (
            <button
              onClick={() => bulkUploadStore.removeDescriptor()}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Scaffold slots table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">#</th>
              {SLOT_COLUMNS.map((col) => (
                <th key={col.field} className="border p-2 text-left">
                  {col.label}
                </th>
              ))}
              <th className="border p-2 text-left w-10"></th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, slotIdx) => (
              <tr key={`${slot.key}-${slot.index}`} className="hover:bg-gray-50">
                <td className="border p-2 font-mono text-xs">{slot.index}</td>
                {SLOT_COLUMNS.map((col) => (
                  <SlotCell
                    key={col.field}
                    slot={slot}
                    slotIndex={slotIdx}
                    field={col.field}
                    onRemove={() => bulkUploadStore.removeFromSlot(slotIdx, col.field)}
                    onDrop={() => handleDrop(slotIdx, col.field)}
                    isDragging={dragSource !== null}
                  />
                ))}
                <td className="border p-2 text-center">
                  <button
                    onClick={() => bulkUploadStore.removeSlot(slotIdx)}
                    className="text-red-400 hover:text-red-600 text-xs"
                    title="Remove slot"
                  >
                    &#10005;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {slots.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            No scaffold slots auto-detected. Add slots below to assign files manually.
          </p>
        )}
      </div>

      <button
        onClick={() => bulkUploadStore.addEmptySlot()}
        className="text-sm text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-1"
      >
        + Add Scaffold Slot
      </button>

      {/* Unassigned files */}
      <div className="mb-6">
        <button
          onClick={() => setExpandedUnassigned(!expandedUnassigned)}
          className="text-sm font-medium text-gray-700 flex items-center gap-1"
        >
          {expandedUnassigned ? "\u25BC" : "\u25B6"} Unassigned Files ({unassignedFiles.length})
        </button>
        {expandedUnassigned && unassignedFiles.length > 0 && (
          <div className="mt-2 border rounded p-2 max-h-40 overflow-y-auto">
            {unassignedFiles.map((cf, i) => (
              <div
                key={`${cf.file.name}-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                className="flex items-center justify-between py-1 px-2 text-sm hover:bg-gray-100 cursor-grab rounded"
              >
                <span className="truncate mr-2" title={cf.file.name}>{cf.file.name}</span>
                <span className="text-xs text-gray-400">{cf.role}</span>
              </div>
            ))}
          </div>
        )}
        {expandedUnassigned && unassignedFiles.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">All files assigned.</p>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-600 mb-4">
        {slots.length} scaffold slot{slots.length !== 1 ? "s" : ""} detected,{" "}
        {bulkUploadStore.slotsWithMeshes} with meshes,{" "}
        {unassignedFiles.length} unassigned file{unassignedFiles.length !== 1 ? "s" : ""}
      </div>

      <div className="flex gap-3 justify-end items-stretch">
        <button
          onClick={() => bulkUploadStore.setStep(BulkUploadStep.Drop)}
          className="button-outline w-32 !py-2.5 !mb-3"
        >
          Back
        </button>
        <button
          onClick={() => bulkUploadStore.setStep(BulkUploadStep.Target)}
          disabled={!canContinue}
          className="button-primary w-32"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const SlotCell: React.FC<{
  slot: ScaffoldSlot;
  slotIndex: number;
  field: SlotField;
  onRemove: () => void;
  onDrop: () => void;
  isDragging: boolean;
}> = ({ slot, field, onRemove, onDrop, isDragging }) => {
  const file = slot[field];
  const [dragOver, setDragOver] = useState(false);

  return (
    <td
      className={`border p-2 ${dragOver ? "bg-blue-50" : ""} ${
        isDragging && !file ? "bg-gray-50" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDrop();
      }}
    >
      {file ? (
        <div className="relative group flex items-center gap-1">
          <span className="truncate text-xs max-w-[140px]">
            {file.file.name}
          </span>
          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-600 text-xs ml-auto flex-shrink-0"
            title="Remove"
          >
            &#10005;
          </button>
          {/* Hover tooltip */}
          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 pointer-events-none">
            {file.file.name}
          </div>
        </div>
      ) : (
        <span className="text-xs text-gray-300">
          {isDragging ? "Drop here" : "\u2014"}
        </span>
      )}
    </td>
  );
};

export default observer(BulkUploadReview);
