import { makeAutoObservable, runInAction } from "mobx";
import {
  BulkUploadStep,
  ClassificationResult,
  ClassifiedFile,
  DomainUploadItem,
  DomainUploadStatus,
  FileRole,
  ScaffoldSlot,
  ScreenshotQueueItem,
  TargetMode,
} from "../../features/bulk-upload/bulk-upload-types";
import { classifyAndGroup } from "../../features/bulk-upload/bulk-upload-classifier";
import { ScaffoldGroup } from "../models/scaffoldGroup";
import { store } from "./store";
import { ImageCategory, ImageToCreate } from "../models/image";

export default class BulkUploadStore {
  // Wizard state
  step: BulkUploadStep = BulkUploadStep.Drop;

  // Classification result
  descriptorFile: ClassifiedFile | null = null;
  slots: ScaffoldSlot[] = [];
  unassignedFiles: ClassifiedFile[] = [];

  // Target selection
  targetMode: TargetMode = TargetMode.CreateNew;
  selectedExistingGroupId: number | null = null;
  upsertMode: boolean = false;

  // Upload pipeline
  domainQueue: DomainUploadItem[] = [];
  domainProgress: number = 0;
  groupUploadProgress: number = 0;
  isUploading: boolean = false;
  createdGroups: ScaffoldGroup[] = [];

  // Screenshot queue
  screenshotQueue: ScreenshotQueueItem[] = [];
  screenshotProgress: number = 0;

  // Parsed descriptor JSON (from file or excel)
  parsedDescriptorJson: any = null;

  constructor() {
    makeAutoObservable(this);
  }

  // --- Step Navigation ---

  setStep = (step: BulkUploadStep) => {
    this.step = step;
  };

  // --- Step 1: Drop ---

  classifyFiles = async (files: File[]) => {
    const result: ClassificationResult = await classifyAndGroup(files);

    runInAction(() => {
      this.descriptorFile = result.descriptorFile;
      this.slots = result.slots;
      this.unassignedFiles = result.unassignedFiles;
    });

    return result;
  };

  // --- Step 2: Review ---

  removeFromSlot = (
    slotIndex: number,
    field: "particleMesh" | "poreMesh" | "particleMetadata" | "poreMetadata"
  ) => {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    const removed = slot[field];
    if (removed) {
      slot[field] = null;
      this.unassignedFiles.push(removed);
    }
  };

  assignToSlot = (
    slotIndex: number,
    field: "particleMesh" | "poreMesh" | "particleMetadata" | "poreMetadata",
    unassignedIndex: number
  ) => {
    const slot = this.slots[slotIndex];
    if (!slot) return;

    const file = this.unassignedFiles[unassignedIndex];
    if (!file) return;

    // If slot already has a file in this field, push it back to unassigned
    const existing = slot[field];
    if (existing) {
      this.unassignedFiles.push(existing);
    }

    slot[field] = file;
    this.unassignedFiles = this.unassignedFiles.filter((_, i) => i !== unassignedIndex);
  };

  addEmptySlot = () => {
    const nextIndex = this.slots.length > 0
      ? Math.max(...this.slots.map((s) => s.index)) + 1
      : 1;
    this.slots.push({
      key: "manual",
      index: nextIndex,
      particleMesh: null,
      poreMesh: null,
      particleMetadata: null,
      poreMetadata: null,
    });
  };

  removeSlot = (slotIndex: number) => {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    // Move any assigned files back to unassigned
    const fields: Array<"particleMesh" | "poreMesh" | "particleMetadata" | "poreMetadata"> =
      ["particleMesh", "poreMesh", "particleMetadata", "poreMetadata"];
    for (const field of fields) {
      if (slot[field]) {
        this.unassignedFiles.push(slot[field]!);
      }
    }
    this.slots = this.slots.filter((_, i) => i !== slotIndex);
  };

  removeDescriptor = () => {
    if (this.descriptorFile) {
      this.unassignedFiles.push(this.descriptorFile);
      this.descriptorFile = null;
    }
  };

  setDescriptorFromUnassigned = (unassignedIndex: number) => {
    const file = this.unassignedFiles[unassignedIndex];
    if (!file) return;
    if (this.descriptorFile) {
      this.unassignedFiles.push(this.descriptorFile);
    }
    this.descriptorFile = file;
    this.unassignedFiles = this.unassignedFiles.filter((_, i) => i !== unassignedIndex);
  };

  setParsedDescriptorJson = (json: any) => {
    this.parsedDescriptorJson = json;
  };

  // --- Step 3: Target ---

  setTargetMode = (mode: TargetMode) => {
    this.targetMode = mode;
  };

  setSelectedExistingGroupId = (id: number | null) => {
    this.selectedExistingGroupId = id;
  };

  setUpsertMode = (upsert: boolean) => {
    this.upsertMode = upsert;
  };

  // --- Step 4: Upload Pipeline ---

  buildDomainQueue = (scaffoldIds: number[]) => {
    const queue: DomainUploadItem[] = [];

    console.log(`[buildDomainQueue] scaffoldIds (${scaffoldIds.length}):`, scaffoldIds);
    console.log(`[buildDomainQueue] slots (${this.slots.length}):`, this.slots.map((s, i) => ({
      idx: i,
      key: s.key,
      index: s.index,
      hasParticleMesh: !!s.particleMesh,
      hasPoreMesh: !!s.poreMesh,
      hasParticleMeta: !!s.particleMetadata,
      hasPoreMeta: !!s.poreMetadata,
    })));

    this.slots.forEach((slot, idx) => {
      const scaffoldId = scaffoldIds[idx];
      if (!scaffoldId) {
        console.warn(`[buildDomainQueue] Slot ${idx} (index=${slot.index}) has no matching scaffoldId — skipping`);
        return;
      }

      if (slot.particleMesh) {
        console.log(`[buildDomainQueue] Queuing particle mesh for slot ${idx} → scaffoldId ${scaffoldId}: ${slot.particleMesh.file.name}`);
        queue.push({
          slotKey: slot.key,
          slotIndex: slot.index,
          scaffoldId,
          category: 0, // Particles
          meshFile: slot.particleMesh.file,
          metadataFile: slot.particleMetadata?.file ?? null,
          status: DomainUploadStatus.Pending,
        });
      }

      if (slot.poreMesh) {
        console.log(`[buildDomainQueue] Queuing pore mesh for slot ${idx} → scaffoldId ${scaffoldId}: ${slot.poreMesh.file.name}`);
        queue.push({
          slotKey: slot.key,
          slotIndex: slot.index,
          scaffoldId,
          category: 1, // Pores
          meshFile: slot.poreMesh.file,
          metadataFile: slot.poreMetadata?.file ?? null,
          status: DomainUploadStatus.Pending,
        });
      }

      if (!slot.particleMesh && !slot.poreMesh) {
        console.warn(`[buildDomainQueue] Slot ${idx} (index=${slot.index}) has no mesh files assigned`);
      }
    });

    console.log(`[buildDomainQueue] Total domain queue items: ${queue.length}`);
    this.domainQueue = queue;
  };

  runUploadPipeline = async () => {
    this.isUploading = true;
    const { scaffoldGroupStore, domainStore } = store;

    try {
      let scaffoldIds: number[] = [];

      // Phase A: Create scaffold group if needed
      if (this.targetMode === TargetMode.CreateNew) {
        if (!this.parsedDescriptorJson) {
          throw new Error("No descriptor JSON available for creating scaffold group");
        }

        const descriptorArray = Array.isArray(this.parsedDescriptorJson)
          ? this.parsedDescriptorJson
          : [this.parsedDescriptorJson];

        console.log(`[runUploadPipeline] Sending descriptor JSON (${descriptorArray.length} group(s)):`,
          JSON.stringify(descriptorArray, null, 2).substring(0, 2000)
        );
        console.log(`[runUploadPipeline] Scaffold counts per group:`,
          descriptorArray.map((g: any, i: number) => `Group ${i}: ${g?.scaffolds?.length ?? 0} scaffolds`)
        );

        const batchResponse = await scaffoldGroupStore.uploadScaffoldGroupBatchStreamed(
          descriptorArray,
          (pct) => runInAction(() => { this.groupUploadProgress = pct; })
        );

        if (!batchResponse || batchResponse.length === 0) {
          throw new Error("Failed to create scaffold groups");
        }

        console.log(`[runUploadPipeline] Batch response:`, JSON.stringify(batchResponse, null, 2).substring(0, 2000));

        runInAction(() => {
          this.createdGroups = batchResponse;
        });

        scaffoldIds = batchResponse.flatMap((g) => g.scaffoldIds ?? []);
        console.log(`[runUploadPipeline] Phase A complete. Created ${batchResponse.length} group(s) with scaffoldIds:`, scaffoldIds);
      } else {
        // Phase A (existing): get scaffold IDs from selected group
        const group = scaffoldGroupStore.uploadedScaffoldGroups.find(
          (g) => g.id === this.selectedExistingGroupId
        ) ?? scaffoldGroupStore.scaffoldGroups.find(
          (g) => g.id === this.selectedExistingGroupId
        );

        if (!group) {
          throw new Error("Selected scaffold group not found");
        }

        runInAction(() => {
          this.createdGroups = [group];
        });

        scaffoldIds = group.scaffoldIds;
      }

      // Phase B: Upload domains sequentially
      this.buildDomainQueue(scaffoldIds);

      for (let i = 0; i < this.domainQueue.length; i++) {
        const item = this.domainQueue[i];

        runInAction(() => {
          item.status = DomainUploadStatus.Uploading;
          this.domainProgress = Math.round((i / this.domainQueue.length) * 100);
        });

        try {
          await domainStore.uploadDomainMesh(
            item.scaffoldId,
            item.meshFile,
            item.category,
            undefined,
            undefined,
            item.metadataFile
          );

          runInAction(() => {
            item.status = DomainUploadStatus.Success;
          });
        } catch (error: any) {
          console.error(`Domain upload failed for scaffold ${item.scaffoldId}, category ${item.category}:`, error);
          runInAction(() => {
            item.status = DomainUploadStatus.Failed;
            item.error = error?.message ?? "Upload failed";
          });
        }
      }

      runInAction(() => {
        this.domainProgress = 100;
      });

      // Build screenshot queue from successful uploads
      this.buildScreenshotQueue();

      console.log(`[runUploadPipeline] Pipeline complete. Domain queue: ${this.domainQueue.length}, successful: ${this.successfulDomainUploads}, failed: ${this.failedDomainUploads}, screenshot queue: ${this.screenshotQueue.length}`);

      // Only auto-transition to screenshots if there were successful domain uploads
      if (this.successfulDomainUploads > 0) {
        runInAction(() => {
          this.step = BulkUploadStep.Screenshots;
        });
      }
    } catch (error) {
      console.error("Upload pipeline failed:", error);
      throw error;
    } finally {
      runInAction(() => {
        this.isUploading = false;
      });
    }
  };

  // --- Step 5: Screenshots ---

  buildScreenshotQueue = () => {
    const items: ScreenshotQueueItem[] = [];
    const seen = new Set<string>();

    for (const item of this.domainQueue) {
      if (item.status !== DomainUploadStatus.Success) continue;

      const groupId = this.createdGroups.find((g) =>
        g.scaffoldIds.includes(item.scaffoldId)
      )?.id;

      if (!groupId) continue;

      const key = `${item.scaffoldId}-${item.category}`;
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        scaffoldId: item.scaffoldId,
        scaffoldGroupId: groupId,
        category: item.category,
        status: DomainUploadStatus.Pending,
      });
    }

    this.screenshotQueue = items;
  };

  handleScreenshotReady = async (blob: Blob, queueIndex: number) => {
    const item = this.screenshotQueue[queueIndex];
    if (!item) return;

    const { scaffoldGroupStore } = store;

    try {
      const imageCategory = item.category === 0
        ? ImageCategory.Particles
        : ImageCategory.ExteriorPores;

      const image: ImageToCreate = {
        scaffoldGroupId: item.scaffoldGroupId,
        scaffoldId: item.scaffoldId,
        file: new File([blob], `scaffold-${item.scaffoldId}-cat${item.category}.png`, { type: "image/png" }),
        category: imageCategory,
      };

      await scaffoldGroupStore.uploadImageForScaffoldGroup(item.scaffoldGroupId, image);

      runInAction(() => {
        item.status = DomainUploadStatus.Success;
        this.screenshotProgress = Math.round(
          ((queueIndex + 1) / this.screenshotQueue.length) * 100
        );
      });
    } catch (error) {
      console.error(`Screenshot upload failed for scaffold ${item.scaffoldId}:`, error);
      runInAction(() => {
        item.status = DomainUploadStatus.Failed;
      });
    }
  };

  // --- Undo ---

  undoUpload = async (): Promise<{ deleted: number; failed: number }> => {
    const { scaffoldGroupStore } = store;
    let deleted = 0;
    let failed = 0;

    for (const group of this.createdGroups) {
      try {
        await scaffoldGroupStore.deleteScaffoldGroup(group.id);
        scaffoldGroupStore.removeUploadedScaffoldGroup(group.id);
        deleted++;
        console.log(`[undoUpload] Deleted scaffold group ${group.id}`);
      } catch (error) {
        console.error(`[undoUpload] Failed to delete scaffold group ${group.id}:`, error);
        failed++;
      }
    }

    return { deleted, failed };
  };

  // --- Reset ---

  reset = () => {
    this.step = BulkUploadStep.Drop;
    this.descriptorFile = null;
    this.slots = [];
    this.unassignedFiles = [];
    this.targetMode = TargetMode.CreateNew;
    this.selectedExistingGroupId = null;
    this.upsertMode = false;
    this.domainQueue = [];
    this.domainProgress = 0;
    this.groupUploadProgress = 0;
    this.isUploading = false;
    this.createdGroups = [];
    this.screenshotQueue = [];
    this.screenshotProgress = 0;
    this.parsedDescriptorJson = null;
  };

  // --- Computed ---

  get totalSlots() {
    return this.slots.length;
  }

  get slotsWithMeshes() {
    return this.slots.filter((s) => s.particleMesh || s.poreMesh).length;
  }

  get successfulDomainUploads() {
    return this.domainQueue.filter((d) => d.status === DomainUploadStatus.Success).length;
  }

  get failedDomainUploads() {
    return this.domainQueue.filter((d) => d.status === DomainUploadStatus.Failed).length;
  }

  get successfulScreenshots() {
    return this.screenshotQueue.filter((s) => s.status === DomainUploadStatus.Success).length;
  }
}
