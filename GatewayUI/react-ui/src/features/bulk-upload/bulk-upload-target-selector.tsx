import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { BulkUploadStep, FileRole, TargetMode } from "./bulk-upload-types";
import { processExcelFile } from "../../app/common/excel-processor/excel-processor";
import toast from "react-hot-toast";

const BulkUploadTargetSelector: React.FC = () => {
  const { bulkUploadStore, scaffoldGroupStore, resourceStore } = useStore();
  const {
    targetMode,
    descriptorFile,
    slots,
    selectedExistingGroupId,
    upsertMode,
    parsedDescriptorJson,
  } = bulkUploadStore;

  const [isParsingDescriptor, setIsParsingDescriptor] = useState(false);
  const [descriptorScaffoldCount, setDescriptorScaffoldCount] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Load uploaded groups for "add to existing" option
  useEffect(() => {
    if (scaffoldGroupStore.uploadedScaffoldGroups.length === 0) {
      scaffoldGroupStore.getUploadedScaffoldGroups();
    }
  }, [scaffoldGroupStore]);

  // Parse descriptor file when component mounts or descriptor changes
  useEffect(() => {
    if (!descriptorFile) return;

    const parseDescriptor = async () => {
      setIsParsingDescriptor(true);
      setParseError(null);

      try {
        if (descriptorFile.role === FileRole.Excel) {
          // Need descriptor types for Excel parsing
          const descriptorTypes = await resourceStore.getDescriptorTypes();

          const json = await processExcelFile(descriptorFile.file, descriptorTypes);
          bulkUploadStore.setParsedDescriptorJson(json);

          const scaffoldCount = json?.scaffolds?.length ?? 0;
          setDescriptorScaffoldCount(scaffoldCount);
        } else {
          // JSON descriptor
          const text = await descriptorFile.file.text();
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          bulkUploadStore.setParsedDescriptorJson(arr.length === 1 ? arr[0] : arr);

          const scaffoldCount = arr.reduce(
            (sum: number, g: any) => sum + (g.scaffolds?.length ?? 0),
            0
          );
          setDescriptorScaffoldCount(scaffoldCount);
        }
      } catch (error: any) {
        console.error("Failed to parse descriptor:", error);
        setParseError(error?.message ?? "Failed to parse descriptor file");
      } finally {
        setIsParsingDescriptor(false);
      }
    };

    parseDescriptor();
  }, [descriptorFile, bulkUploadStore, resourceStore]);

  const handleStartUpload = async () => {
    if (targetMode === TargetMode.CreateNew && !parsedDescriptorJson) {
      toast.error("No descriptor file available. Cannot create new scaffold group.");
      return;
    }

    if (targetMode === TargetMode.AddToExisting && !selectedExistingGroupId) {
      toast.error("Please select an existing scaffold group.");
      return;
    }

    bulkUploadStore.setStep(BulkUploadStep.Upload);
  };

  const scaffoldCountMismatch =
    descriptorScaffoldCount !== null &&
    descriptorScaffoldCount !== slots.length &&
    targetMode === TargetMode.CreateNew;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Step 3: Upload Target</h2>

      {/* Mode selection */}
      <div className="space-y-3 mb-6">
        <label
          className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${
            targetMode === TargetMode.CreateNew ? "border-blue-500 bg-blue-50" : "border-gray-200"
          }`}
        >
          <input
            type="radio"
            name="targetMode"
            checked={targetMode === TargetMode.CreateNew}
            onChange={() => bulkUploadStore.setTargetMode(TargetMode.CreateNew)}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Create new scaffold group</div>
            <div className="text-sm text-gray-500">
              Uses descriptor file to create a new group, then uploads domains to each scaffold.
            </div>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${
            targetMode === TargetMode.AddToExisting
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200"
          }`}
        >
          <input
            type="radio"
            name="targetMode"
            checked={targetMode === TargetMode.AddToExisting}
            onChange={() => bulkUploadStore.setTargetMode(TargetMode.AddToExisting)}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Add domains to existing scaffold group</div>
            <div className="text-sm text-gray-500">
              Select an existing group and upload domain meshes to its scaffolds.
            </div>
          </div>
        </label>
      </div>

      {/* Create New panel */}
      {targetMode === TargetMode.CreateNew && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          {isParsingDescriptor && (
            <p className="text-sm text-gray-500">Parsing descriptor file...</p>
          )}
          {parseError && (
            <p className="text-sm text-red-600">Error: {parseError}</p>
          )}
          {!isParsingDescriptor && !parseError && descriptorFile && (
            <>
              <p className="text-sm mb-1">
                Descriptor: <strong>{descriptorFile.file.name}</strong>
              </p>
              {descriptorScaffoldCount !== null && (
                <p className="text-sm">
                  Scaffolds in descriptor: <strong>{descriptorScaffoldCount}</strong>
                </p>
              )}
              {scaffoldCountMismatch && (
                <p className="text-sm text-yellow-600 mt-2">
                  Warning: Descriptor has {descriptorScaffoldCount} scaffold(s) but{" "}
                  {slots.length} domain slot(s) detected. Slots will be mapped by order.
                </p>
              )}
            </>
          )}
          {!descriptorFile && (
            <p className="text-sm text-red-600">
              No descriptor file detected. Go back and add a .json or .xlsx descriptor file.
            </p>
          )}
        </div>
      )}

      {/* Add to Existing panel */}
      {targetMode === TargetMode.AddToExisting && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <label className="block text-sm font-medium mb-2">Select scaffold group:</label>
          <select
            value={selectedExistingGroupId ?? ""}
            onChange={(e) =>
              bulkUploadStore.setSelectedExistingGroupId(
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className="w-full border rounded p-2 text-sm"
          >
            <option value="">-- Select a group --</option>
            {scaffoldGroupStore.uploadedScaffoldGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name || `Group #${g.id}`} ({g.scaffoldIds.length} scaffolds)
              </option>
            ))}
          </select>

          {selectedExistingGroupId && (
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={upsertMode}
                  onChange={(e) => bulkUploadStore.setUpsertMode(e.target.checked)}
                />
                Upsert mode (replace existing domains if present)
              </label>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-gray-600 mb-4">
        {slots.length} domain slot{slots.length !== 1 ? "s" : ""} ready for upload
      </div>

      <div className="flex gap-3 justify-end items-stretch">
        <button
          onClick={() => bulkUploadStore.setStep(BulkUploadStep.Review)}
          className="button-outline w-32 !py-2.5 !mb-3"
        >
          Back
        </button>
        <button
          onClick={handleStartUpload}
          disabled={
            (targetMode === TargetMode.CreateNew && (!parsedDescriptorJson || isParsingDescriptor)) ||
            (targetMode === TargetMode.AddToExisting && !selectedExistingGroupId)
          }
          className="button-primary w-32"
        >
          Start Upload
        </button>
      </div>
    </div>
  );
};

export default observer(BulkUploadTargetSelector);
