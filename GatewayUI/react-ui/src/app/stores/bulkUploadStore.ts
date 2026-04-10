import { makeAutoObservable, runInAction } from "mobx";
import {
  BulkUploadStep,
  ClassificationResult,
  ClassifiedFile,
  DomainUploadItem,
  DomainUploadStatus,
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
  descriptorFiles: ClassifiedFile[] = [];
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
  appendedScaffoldIds: number[] = [];

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
      this.descriptorFiles = result.descriptorFiles;
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
      segmentIndex: null,
      descriptorFile: null,
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

  removeDescriptorFromSlot = (slotIndex: number) => {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    slot.descriptorFile = null;
  };

  assignDescriptorToSlot = (slotIndex: number, descriptorIndex: number) => {
    const slot = this.slots[slotIndex];
    const descriptorFile = this.availableDescriptorFiles[descriptorIndex];
    if (!slot || !descriptorFile) return;

    slot.descriptorFile = descriptorFile;
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
    const uploadableSlots = this.slots.filter((slot) => slot.particleMesh || slot.poreMesh);

    console.log(`[buildDomainQueue] scaffoldIds (${scaffoldIds.length}):`, scaffoldIds);
    console.log(`[buildDomainQueue] uploadable slots (${uploadableSlots.length}):`, uploadableSlots.map((s, i) => ({
      idx: i,
      key: s.key,
      index: s.index,
      segmentIndex: s.segmentIndex,
      descriptor: s.descriptorFile?.file.name ?? null,
      hasParticleMesh: !!s.particleMesh,
      hasPoreMesh: !!s.poreMesh,
      hasParticleMeta: !!s.particleMetadata,
      hasPoreMeta: !!s.poreMetadata,
    })));

    uploadableSlots.forEach((slot, idx) => {
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
          this.appendedScaffoldIds = [];
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

        const uploadableSlots = this.slots.filter((slot) => slot.particleMesh || slot.poreMesh);

        if (this.parsedDescriptorJson) {
          if (Array.isArray(this.parsedDescriptorJson)) {
            throw new Error("Appending to an existing scaffold group expects a single compatible descriptor payload.");
          }

          const appendPayload = this.parsedDescriptorJson;

          const appendCount = appendPayload?.scaffolds?.length ?? 0;
          if (appendCount <= 0) {
            throw new Error("Descriptor payload did not contain any scaffolds to append.");
          }

          const updatedGroup = await scaffoldGroupStore.appendScaffoldsToGroup(group.id, appendPayload);
          if (!updatedGroup) {
            throw new Error("Failed to append scaffolds to existing scaffold group.");
          }

          runInAction(() => {
            this.createdGroups = [updatedGroup];
            this.appendedScaffoldIds = updatedGroup.scaffoldIds.slice(-appendCount);
          });

          if (appendCount !== uploadableSlots.length) {
            console.warn(
              `[runUploadPipeline] Appended ${appendCount} scaffold(s) but detected ${uploadableSlots.length} mesh-backed slot(s). Mapping will use appended scaffold order.`
            );
          }

          scaffoldIds = updatedGroup.scaffoldIds.slice(-appendCount);
        } else {
          runInAction(() => {
            this.appendedScaffoldIds = [];
          });
          scaffoldIds = group.scaffoldIds;
        }
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

    // Per scaffold, track which domain meshes uploaded successfully so we
    // can derive the right set of thumbnail categories to render.
    const perScaffold = new Map<
      number,
      { hasParticleMesh: boolean; hasPoreMesh: boolean; groupId: number }
    >();

    for (const item of this.domainQueue) {
      if (item.status !== DomainUploadStatus.Success) continue;

      const groupId = this.createdGroups.find((g) =>
        g.scaffoldIds.includes(item.scaffoldId)
      )?.id;
      if (!groupId) continue;

      const entry =
        perScaffold.get(item.scaffoldId) ?? {
          hasParticleMesh: false,
          hasPoreMesh: false,
          groupId,
        };
      if (item.category === 0) entry.hasParticleMesh = true;
      if (item.category === 1) entry.hasPoreMesh = true;
      perScaffold.set(item.scaffoldId, entry);
    }

    perScaffold.forEach((info, scaffoldId) => {
      if (info.hasParticleMesh) {
        items.push({
          scaffoldId,
          scaffoldGroupId: info.groupId,
          category: ImageCategory.Particles,
          status: DomainUploadStatus.Pending,
        });
      }
      if (info.hasPoreMesh) {
        items.push({
          scaffoldId,
          scaffoldGroupId: info.groupId,
          category: ImageCategory.ExteriorPores,
          status: DomainUploadStatus.Pending,
        });
        items.push({
          scaffoldId,
          scaffoldGroupId: info.groupId,
          category: ImageCategory.InteriorPores,
          status: DomainUploadStatus.Pending,
        });
      }
      if (info.hasParticleMesh && info.hasPoreMesh) {
        items.push({
          scaffoldId,
          scaffoldGroupId: info.groupId,
          category: ImageCategory.HalfHalf,
          status: DomainUploadStatus.Pending,
        });
      }
    });

    this.screenshotQueue = items;
  };

  handleScreenshotReady = async (blob: Blob, queueIndex: number) => {
    const item = this.screenshotQueue[queueIndex];
    if (!item) return;

    const { scaffoldGroupStore } = store;

    try {
      const image: ImageToCreate = {
        scaffoldGroupId: item.scaffoldGroupId,
        scaffoldId: item.scaffoldId,
        file: new File([blob], `scaffold-${item.scaffoldId}-cat${item.category}.png`, { type: "image/png" }),
        category: item.category as ImageCategory,
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
        this.screenshotProgress = Math.round(
          ((queueIndex + 1) / this.screenshotQueue.length) * 100
        );
      });
    }
  };

  markScreenshotFailed = (queueIndex: number) => {
    const item = this.screenshotQueue[queueIndex];
    if (!item) return;
    runInAction(() => {
      item.status = DomainUploadStatus.Failed;
      this.screenshotProgress = Math.round(
        ((queueIndex + 1) / this.screenshotQueue.length) * 100
      );
    });
  };

  // --- Undo ---

  undoUpload = async (): Promise<{ deleted: number; failed: number }> => {
    const { scaffoldGroupStore } = store;
    let deleted = 0;
    let failed = 0;

    if (this.targetMode === TargetMode.AddToExisting) {
      for (const scaffoldId of this.appendedScaffoldIds) {
        try {
          const deletedScaffoldGroup = await scaffoldGroupStore.deleteScaffold(scaffoldId);
          if (!deletedScaffoldGroup) {
            throw new Error("Delete scaffold request failed");
          }
          deleted++;
          console.log(`[undoUpload] Deleted appended scaffold ${scaffoldId}`);
        } catch (error) {
          console.error(`[undoUpload] Failed to delete scaffold ${scaffoldId}:`, error);
          failed++;
        }
      }

      return { deleted, failed };
    }

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
    this.descriptorFiles = [];
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
    this.appendedScaffoldIds = [];
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

  get slotsWithAssignedDescriptors() {
    return this.slots.filter((s) => s.descriptorFile).length;
  }

  get slotsWithMeshesNeedingDescriptors() {
    return this.slots.filter((s) => (s.particleMesh || s.poreMesh) && !s.descriptorFile).length;
  }

  get availableDescriptorFiles() {
    const assigned = new Set(this.slots.map((slot) => slot.descriptorFile).filter(Boolean));
    return this.descriptorFiles.filter((file) => !assigned.has(file));
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
