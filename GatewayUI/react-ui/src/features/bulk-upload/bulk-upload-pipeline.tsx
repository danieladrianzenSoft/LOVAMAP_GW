import React, { useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { BulkUploadStep, DomainUploadStatus, TargetMode } from "./bulk-upload-types";
import toast from "react-hot-toast";

const BulkUploadPipeline: React.FC = () => {
  const { bulkUploadStore } = useStore();
  const {
    isUploading,
    targetMode,
    groupUploadProgress,
    domainProgress,
    domainQueue,
    successfulDomainUploads,
    failedDomainUploads,
    createdGroups,
  } = bulkUploadStore;

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    bulkUploadStore.runUploadPipeline().catch((err) => {
      console.error("Pipeline error:", err);
      toast.error(err?.message ?? "Upload pipeline failed");
    });
  }, [bulkUploadStore]);

  const isGroupPhase = targetMode === TargetMode.CreateNew && createdGroups.length === 0 && isUploading;
  const isDomainPhase = domainQueue.length > 0;
  const isComplete = !isUploading && (domainQueue.length > 0 || createdGroups.length > 0);
  const emptyQueue = !isUploading && domainQueue.length === 0 && createdGroups.length > 0;
  const allFailed = isComplete && domainQueue.length > 0 && successfulDomainUploads === 0;

  const totalScaffoldIds = createdGroups.reduce((sum, g) => sum + g.scaffoldIds.length, 0);
  const slotCount = bulkUploadStore.slots.length;
  const slotsWithMeshes = bulkUploadStore.slotsWithMeshes;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Step 4: Uploading</h2>

      {/* Phase A: Creating scaffold group */}
      {targetMode === TargetMode.CreateNew && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">
            Phase A: Create Scaffold Group
            {createdGroups.length > 0 && (
              <span className="text-green-600 ml-2">&#10003; Done</span>
            )}
          </h3>
          {isGroupPhase && (
            <ProgressBar value={groupUploadProgress} label="Uploading descriptor..." />
          )}
          {createdGroups.length > 0 && (
            <p className="text-sm text-gray-600">
              Created {createdGroups.length} group(s) with {totalScaffoldIds} scaffold(s)
            </p>
          )}
        </div>
      )}

      {/* Phase B: Domain uploads */}
      {isDomainPhase && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">
            Phase B: Upload Domain Meshes
            {isComplete && !allFailed && <span className="text-green-600 ml-2">&#10003; Done</span>}
            {allFailed && <span className="text-red-600 ml-2">&#10005; All Failed</span>}
          </h3>
          <ProgressBar value={domainProgress} label={`${successfulDomainUploads + failedDomainUploads} / ${domainQueue.length} domains`} />

          <div className="mt-3 max-h-48 overflow-y-auto border rounded">
            {domainQueue.map((item, i) => (
              <div
                key={`${item.scaffoldId}-${item.category}-${i}`}
                className="flex items-center justify-between px-3 py-1.5 text-sm border-b last:border-0"
              >
                <span className="truncate mr-2">
                  Scaffold {item.scaffoldId} — {item.category === 0 ? "Particles" : "Pores"}
                  <span className="text-gray-400 ml-1" title={item.meshFile?.name}>({item.meshFile?.name})</span>
                </span>
                <StatusBadge status={item.status} error={item.error} />
              </div>
            ))}
          </div>

          {isComplete && (
            <div className="mt-3 text-sm">
              <span className="text-green-600">{successfulDomainUploads} succeeded</span>
              {failedDomainUploads > 0 && (
                <span className="text-red-600 ml-3">{failedDomainUploads} failed</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty queue diagnostic */}
      {emptyQueue && (
        <div className="mb-6 p-4 border border-yellow-300 bg-yellow-50 rounded">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">No domain uploads queued</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>Scaffold IDs from backend: <strong>{totalScaffoldIds}</strong></li>
            <li>Slots in review table: <strong>{slotCount}</strong></li>
            <li>Slots with mesh files: <strong>{slotsWithMeshes}</strong></li>
          </ul>
          <p className="text-sm text-yellow-700 mt-2">
            {slotsWithMeshes === 0
              ? "No slots have mesh files assigned. Go back to Review and drag .glb files into slot cells."
              : totalScaffoldIds === 0
              ? "The descriptor created 0 scaffolds. Check your descriptor file."
              : totalScaffoldIds < slotCount
              ? `Only ${totalScaffoldIds} scaffold(s) were created but you have ${slotCount} slot(s). Extra slots have no scaffold to upload to.`
              : "Slots and scaffold IDs could not be matched. Check the console for details."}
          </p>
        </div>
      )}

      {/* Waiting state */}
      {isUploading && !isDomainPhase && !isGroupPhase && (
        <p className="text-sm text-gray-500">Preparing upload...</p>
      )}

      {/* Actions when complete */}
      {isComplete && (
        <div className="flex gap-3 justify-end items-stretch mt-4">
          {(emptyQueue || allFailed) && (
            <button
              onClick={() => bulkUploadStore.setStep(BulkUploadStep.Review)}
              className="button-outline w-32 mb-3"
            >
              Back to Review
            </button>
          )}
          <button
            onClick={() => bulkUploadStore.setStep(BulkUploadStep.Screenshots)}
            disabled={successfulDomainUploads === 0}
            className="button-primary w-44 mb-3"
          >
            {successfulDomainUploads > 0 ? "Continue to Screenshots" : "No Uploads to Screenshot"}
          </button>
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div>
    <div className="flex justify-between text-xs text-gray-500 mb-1">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: DomainUploadStatus; error?: string }> = ({
  status,
  error,
}) => {
  switch (status) {
    case DomainUploadStatus.Pending:
      return <span className="text-xs text-gray-400">Pending</span>;
    case DomainUploadStatus.Uploading:
      return <span className="text-xs text-blue-600">Uploading...</span>;
    case DomainUploadStatus.Success:
      return <span className="text-xs text-green-600">&#10003;</span>;
    case DomainUploadStatus.Failed:
      return (
        <span className="text-xs text-red-600" title={error}>
          &#10005; Failed
        </span>
      );
  }
};

export default observer(BulkUploadPipeline);
