import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { BulkUploadStep, FileRole, ScaffoldSlot } from "./bulk-upload-types";

type SlotField = "descriptorFile" | "particleMesh" | "poreMesh" | "particleMetadata" | "poreMetadata";
type DragSource =
  | { kind: "descriptor"; descriptorIndex: number }
  | { kind: "unassigned"; unassignedIndex: number };

const SLOT_COLUMNS: { field: SlotField; label: string; acceptRoles: FileRole[] }[] = [
  { field: "descriptorFile", label: "Descriptor", acceptRoles: [FileRole.Descriptor, FileRole.Excel] },
  { field: "particleMesh", label: "Particle Mesh", acceptRoles: [FileRole.ParticleMesh] },
  { field: "poreMesh", label: "Pore Mesh", acceptRoles: [FileRole.PoreMesh] },
  { field: "particleMetadata", label: "Particle Meta", acceptRoles: [FileRole.ParticleMetadata] },
  { field: "poreMetadata", label: "Pore Meta", acceptRoles: [FileRole.PoreMetadata] },
];

const BulkUploadReview: React.FC = () => {
  const { bulkUploadStore } = useStore();
  const { slots, unassignedFiles, availableDescriptorFiles, descriptorFiles } = bulkUploadStore;
  const [expandedUnassigned, setExpandedUnassigned] = useState(true);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);

  const handleDrop = (slotIndex: number, field: SlotField) => {
    if (!dragSource) return;

    if (field === "descriptorFile" && dragSource.kind === "descriptor") {
      bulkUploadStore.assignDescriptorToSlot(slotIndex, dragSource.descriptorIndex);
    }

    if (field !== "descriptorFile" && dragSource.kind === "unassigned") {
      bulkUploadStore.assignToSlot(slotIndex, field, dragSource.unassignedIndex);
    }

    setDragSource(null);
  };

  const canContinue = slots.some((s) => s.particleMesh || s.poreMesh);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Step 2: Review & Organize</h2>

      <div className="mb-4 p-3 bg-gray-50 rounded border">
        <div className="text-sm text-gray-700">
          Detected <strong>{descriptorFiles.length}</strong> descriptor
          {descriptorFiles.length !== 1 ? "s" : ""}. Suggested matches were applied where the
          filename pattern lined up with a mesh slot.
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Rule: one descriptor file may contain many scaffolds. If you upload multiple descriptor files,
          each descriptor file must represent exactly one scaffold. Drag a descriptor into the Descriptor
          column to correct any mismatches.
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">
          Available Descriptors ({availableDescriptorFiles.length})
        </h3>
        <div className="border rounded p-2 min-h-[52px]">
          {availableDescriptorFiles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableDescriptorFiles.map((cf, i) => (
                <div
                  key={`${cf.file.name}-${i}`}
                  draggable
                  onDragStart={() => setDragSource({ kind: "descriptor", descriptorIndex: i })}
                  className="px-2 py-1 border rounded bg-white text-xs cursor-grab hover:bg-gray-50"
                  title={cf.file.name}
                >
                  {cf.file.name}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">All detected descriptors are assigned.</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Slot</th>
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
              <tr key={`${slot.key}-${slot.index}-${slot.segmentIndex ?? "none"}`} className="hover:bg-gray-50">
                <td className="border p-2 text-xs">
                  <div className="font-mono">{slot.index}</div>
                  <div className="text-gray-400 truncate max-w-[180px]" title={slot.key}>
                    {slot.key}
                    {slot.segmentIndex !== null ? ` | segment ${slot.segmentIndex}` : ""}
                  </div>
                </td>
                {SLOT_COLUMNS.map((col) => (
                  <SlotCell
                    key={col.field}
                    slot={slot}
                    slotIndex={slotIdx}
                    field={col.field}
                    dragSource={dragSource}
                    onRemove={() => {
                      if (col.field === "descriptorFile") {
                        bulkUploadStore.removeDescriptorFromSlot(slotIdx);
                      } else {
                        bulkUploadStore.removeFromSlot(slotIdx, col.field);
                      }
                    }}
                    onDrop={() => handleDrop(slotIdx, col.field)}
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
                onDragStart={() => setDragSource({ kind: "unassigned", unassignedIndex: i })}
                className="flex items-center justify-between py-1 px-2 text-sm hover:bg-gray-100 cursor-grab rounded"
              >
                <span className="truncate mr-2" title={cf.file.name}>{cf.file.name}</span>
                <span className="text-xs text-gray-400">{cf.role}</span>
              </div>
            ))}
          </div>
        )}
        {expandedUnassigned && unassignedFiles.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">All non-descriptor files assigned.</p>
        )}
      </div>

      <div className="text-sm text-gray-600 mb-4">
        {slots.length} scaffold slot{slots.length !== 1 ? "s" : ""} detected,{" "}
        {bulkUploadStore.slotsWithMeshes} with meshes,{" "}
        {bulkUploadStore.slotsWithAssignedDescriptors} with descriptors,{" "}
        {bulkUploadStore.slotsWithMeshesNeedingDescriptors} mesh slot
        {bulkUploadStore.slotsWithMeshesNeedingDescriptors !== 1 ? "s" : ""} still missing descriptors
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
  dragSource: DragSource | null;
  onRemove: () => void;
  onDrop: () => void;
}> = ({ slot, field, dragSource, onRemove, onDrop }) => {
  const file = slot[field];
  const [dragOver, setDragOver] = useState(false);

  const acceptsDescriptor = field === "descriptorFile" && dragSource?.kind === "descriptor";
  const acceptsUnassigned = field !== "descriptorFile" && dragSource?.kind === "unassigned";
  const canAcceptDrop = acceptsDescriptor || acceptsUnassigned;

  return (
    <td
      className={`border p-2 ${dragOver && canAcceptDrop ? "bg-blue-50" : ""} ${
        canAcceptDrop && !file ? "bg-gray-50" : ""
      }`}
      onDragOver={(e) => {
        if (!canAcceptDrop) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!canAcceptDrop) return;
        e.preventDefault();
        setDragOver(false);
        onDrop();
      }}
    >
      {file ? (
        <div className="relative group flex items-center gap-1">
          <span className="truncate text-xs max-w-[150px]" title={file.file.name}>
            {file.file.name}
          </span>
          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-600 text-xs ml-auto flex-shrink-0"
            title="Remove"
          >
            &#10005;
          </button>
          <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-max max-w-[220px] rounded bg-gray-900 px-2 py-1 text-xs text-white whitespace-normal break-words shadow-lg z-[9999] pointer-events-none">
            {file.file.name}
          </div>
        </div>
      ) : (
        <span className="text-xs text-gray-300">
          {canAcceptDrop ? "Drop here" : "\u2014"}
        </span>
      )}
    </td>
  );
};

export default observer(BulkUploadReview);
