import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { BulkUploadStep, ClassifiedFile, FileRole, TargetMode } from "./bulk-upload-types";
import { processExcelFile } from "../../app/common/excel-processor/excel-processor";
import toast from "react-hot-toast";

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function buildSharedInputSignature(group: any) {
  const particlePropertyGroups = Array.isArray(group?.inputGroup?.particlePropertyGroups)
    ? group.inputGroup.particlePropertyGroups
    : [];

  return JSON.stringify({
    isSimulated: group?.isSimulated ?? null,
    containerShape: group?.inputGroup?.containerShape ?? "",
    packingConfiguration: group?.inputGroup?.packingConfiguration ?? "",
    particlePropertyGroups: particlePropertyGroups.map((particle: any) => ({
      shape: particle?.shape ?? "",
      stiffness: particle?.stiffness ?? "",
    })),
  });
}

function annotateScaffoldCommentsWithSourceFile(parsed: any, sourceFileName: string) {
  const groups = Array.isArray(parsed) ? parsed : [parsed];

  for (const group of groups) {
    if (!group || !Array.isArray(group.scaffolds)) continue;

    for (const scaffold of group.scaffolds) {
      if (!scaffold || typeof scaffold !== "object") continue;
      scaffold.comments = sourceFileName;
    }
  }

  return parsed;
}

const BulkUploadTargetSelector: React.FC = () => {
  const { bulkUploadStore, scaffoldGroupStore, resourceStore } = useStore();
  const {
    targetMode,
    descriptorFiles,
    slots,
    selectedExistingGroupId,
    upsertMode,
    parsedDescriptorJson,
  } = bulkUploadStore;

  const [isParsingDescriptor, setIsParsingDescriptor] = useState(false);
  const [descriptorScaffoldCount, setDescriptorScaffoldCount] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (scaffoldGroupStore.uploadedScaffoldGroups.length === 0) {
      scaffoldGroupStore.getUploadedScaffoldGroups();
    }
  }, [scaffoldGroupStore]);

  useEffect(() => {
    const parseDescriptors = async () => {
      if (descriptorFiles.length === 0) {
        bulkUploadStore.setParsedDescriptorJson(null);
        setDescriptorScaffoldCount(null);
        setParseError(null);
        return;
      }

      setIsParsingDescriptor(true);
      setParseError(null);

      try {
        if (descriptorFiles.length === 1) {
          const parsed = await parseDescriptorFile(descriptorFiles[0], resourceStore);
          const groups = Array.isArray(parsed) ? parsed : [parsed];

          bulkUploadStore.setParsedDescriptorJson(groups.length === 1 ? groups[0] : groups);
          setDescriptorScaffoldCount(
            groups.reduce((sum: number, group: any) => sum + (group?.scaffolds?.length ?? 0), 0)
          );
          return;
        }

        const slotsWithMeshes = slots.filter((slot) => slot.particleMesh || slot.poreMesh);
        const missingDescriptors = slotsWithMeshes.filter((slot) => !slot.descriptorFile);

        if (missingDescriptors.length > 0) {
          throw new Error(
            `Assign descriptor files to all mesh slots before upload. ${missingDescriptors.length} slot(s) still need a descriptor.`
          );
        }

        const orderedDescriptorFiles: ClassifiedFile[] = [];
        const seen = new Set<string>();

        for (const slot of slotsWithMeshes) {
          const descriptorFile = slot.descriptorFile;
          if (!descriptorFile) continue;
          const key = descriptorFile.file.name;
          if (seen.has(key)) continue;
          seen.add(key);
          orderedDescriptorFiles.push(descriptorFile);
        }

        if (orderedDescriptorFiles.length !== slotsWithMeshes.length) {
          throw new Error(
            "Multi-file descriptor mode requires one descriptor file per mesh-backed slot. Remove duplicate assignments and try again."
          );
        }

        const parsedGroups = [];
        let baseGroup: any = null;
        let baseInputSignature: string | null = null;

        for (const descriptorFile of orderedDescriptorFiles) {
          const parsed = await parseDescriptorFile(descriptorFile, resourceStore);
          const groups = Array.isArray(parsed) ? parsed : [parsed];

          if (groups.length !== 1) {
            throw new Error(
              `Descriptor ${descriptorFile.file.name} contains multiple scaffold groups. Use a single descriptor file for multi-scaffold uploads, or split into one scaffold per descriptor file.`
            );
          }

          const group = groups[0];
          const scaffoldCount = group?.scaffolds?.length ?? 0;
          if (scaffoldCount !== 1) {
            throw new Error(
              `Descriptor ${descriptorFile.file.name} contains ${scaffoldCount} scaffolds. Use a single descriptor file for multi-scaffold uploads, or keep multi-file mode to one scaffold per descriptor file.`
            );
          }

          const inputSignature = buildSharedInputSignature(group);

          if (baseGroup === null) {
            baseGroup = cloneJson(group);
            baseInputSignature = inputSignature;
          } else if (inputSignature !== baseInputSignature) {
            throw new Error(
              `Descriptor ${descriptorFile.file.name} does not match the shared scaffold-group settings from the other descriptor files.`
            );
          }

          parsedGroups.push(group);
        }

        const merged = cloneJson(baseGroup);
        merged.originalFileName = "bulk-upload-merged.json";
        merged.scaffolds = parsedGroups.flatMap((group: any) => group?.scaffolds ?? []);

        bulkUploadStore.setParsedDescriptorJson(merged);
        setDescriptorScaffoldCount(merged.scaffolds.length);
      } catch (error: any) {
        console.error("Failed to parse descriptors:", error);
        bulkUploadStore.setParsedDescriptorJson(null);
        setDescriptorScaffoldCount(null);
        setParseError(error?.message ?? "Failed to parse descriptor files");
      } finally {
        setIsParsingDescriptor(false);
      }
    };

    parseDescriptors();
  }, [targetMode, descriptorFiles, slots, bulkUploadStore, resourceStore]);

  const handleStartUpload = async () => {
    if (targetMode === TargetMode.CreateNew && !parsedDescriptorJson) {
      toast.error("No valid descriptor payload available. Cannot create scaffold group.");
      return;
    }

    if (targetMode === TargetMode.AddToExisting && !selectedExistingGroupId) {
      toast.error("Please select an existing scaffold group.");
      return;
    }

    bulkUploadStore.setStep(BulkUploadStep.Upload);
  };

  const uploadableSlotCount = slots.filter((slot) => slot.particleMesh || slot.poreMesh).length;
  const scaffoldCountMismatch =
    descriptorScaffoldCount !== null &&
    descriptorScaffoldCount !== uploadableSlotCount &&
    targetMode === TargetMode.CreateNew;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Step 3: Upload Target</h2>

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
              One descriptor file may contain many scaffolds. If you assign multiple descriptor files, each file must contain exactly one scaffold; those scaffolds will be merged into one new group before domain upload.
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
              Select an existing group and upload domain meshes to its scaffolds. If descriptor files are assigned, their scaffolds will be appended first.
            </div>
          </div>
        </label>
      </div>

      {targetMode === TargetMode.CreateNew && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          {isParsingDescriptor && (
            <p className="text-sm text-gray-500">Parsing descriptor file{descriptorFiles.length !== 1 ? "s" : ""}...</p>
          )}
          {parseError && (
            <p className="text-sm text-red-600">Error: {parseError}</p>
          )}
          {!isParsingDescriptor && !parseError && descriptorFiles.length > 0 && (
            <>
              <p className="text-sm mb-1">
                Descriptor files: <strong>{descriptorFiles.length}</strong>
              </p>
              {descriptorScaffoldCount !== null && (
                <p className="text-sm">
                  Scaffolds in descriptor payload: <strong>{descriptorScaffoldCount}</strong>
                </p>
              )}
              {descriptorFiles.length > 1 && (
                <p className="text-xs text-gray-500 mt-2">
                  Explicit rule: use one descriptor file for multi-scaffold uploads. Multi-file mode is only for one-scaffold-per-file uploads with matching shared scaffold-group metadata.
                </p>
              )}
              {scaffoldCountMismatch && (
                <p className="text-sm text-yellow-600 mt-2">
                  Warning: Descriptor payload has {descriptorScaffoldCount} scaffold(s) but{" "}
                  {uploadableSlotCount} mesh-backed slot(s) detected. Slots will still be mapped by review order.
                </p>
              )}
            </>
          )}
          {!descriptorFiles.length && (
            <p className="text-sm text-red-600">
              No descriptor files detected. Go back and add a .json or .xlsx descriptor file.
            </p>
          )}
        </div>
      )}

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

          {descriptorFiles.length > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              Assigned descriptor files will be used to append new scaffolds to this group before domain upload.
            </div>
          )}

          {parseError && descriptorFiles.length > 0 && (
            <p className="text-sm text-red-600 mt-3">Error: {parseError}</p>
          )}
        </div>
      )}

      <div className="text-sm text-gray-600 mb-4">
        {slots.length} domain slot{slots.length !== 1 ? "s" : ""} ready for upload
      </div>

      <div className="flex gap-3 justify-end items-stretch">
        <button
          onClick={() => bulkUploadStore.setStep(BulkUploadStep.Review)}
          className="button-outline w-32 py-2.5 mb-3"
        >
          Back
        </button>
        <button
          onClick={handleStartUpload}
          disabled={
            (targetMode === TargetMode.CreateNew && (!parsedDescriptorJson || isParsingDescriptor)) ||
            (targetMode === TargetMode.AddToExisting &&
              (!selectedExistingGroupId || (descriptorFiles.length > 0 && (!parsedDescriptorJson || isParsingDescriptor))))
          }
          className="button-primary w-32 py-2.5 mb-3"
        >
          Start Upload
        </button>
      </div>
    </div>
  );
};

async function parseDescriptorFile(descriptorFile: ClassifiedFile, resourceStore: any) {
  if (descriptorFile.role === FileRole.Excel) {
    const descriptorTypes = await resourceStore.getDescriptorTypes();
    const parsed = await processExcelFile(descriptorFile.file, descriptorTypes);
    return annotateScaffoldCommentsWithSourceFile(parsed, descriptorFile.file.name);
  }

  const text = await descriptorFile.file.text();
  const parsed = JSON.parse(text);
  return annotateScaffoldCommentsWithSourceFile(parsed, descriptorFile.file.name);
}

export default observer(BulkUploadTargetSelector);
