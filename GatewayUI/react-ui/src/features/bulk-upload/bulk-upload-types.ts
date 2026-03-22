export enum FileRole {
  Descriptor = "Descriptor",
  Excel = "Excel",
  ParticleMesh = "ParticleMesh",
  PoreMesh = "PoreMesh",
  ParticleMetadata = "ParticleMetadata",
  PoreMetadata = "PoreMetadata",
  Unknown = "Unknown",
}

export interface ClassifiedFile {
  file: File;
  role: FileRole;
  scaffoldKey: string | null;   // normalized group key (null for descriptors / unknown)
  scaffoldIndex: number | null; // numeric index extracted from filename
  segmentIndex: number | null;
}

export interface ScaffoldSlot {
  key: string;
  index: number;
  segmentIndex: number | null;
  descriptorFile: ClassifiedFile | null;
  particleMesh: ClassifiedFile | null;
  poreMesh: ClassifiedFile | null;
  particleMetadata: ClassifiedFile | null;
  poreMetadata: ClassifiedFile | null;
}

export interface ClassificationResult {
  descriptorFiles: ClassifiedFile[];
  slots: ScaffoldSlot[];
  unassignedFiles: ClassifiedFile[];
}

export enum BulkUploadStep {
  Drop = 0,
  Review = 1,
  Target = 2,
  Upload = 3,
  Screenshots = 4,
}

export enum TargetMode {
  CreateNew = "CreateNew",
  AddToExisting = "AddToExisting",
}

export enum DomainUploadStatus {
  Pending = "Pending",
  Uploading = "Uploading",
  Success = "Success",
  Failed = "Failed",
}

export interface DomainUploadItem {
  slotKey: string;
  slotIndex: number;
  scaffoldId: number;
  category: number; // 0 = Particles, 1 = Pores
  meshFile: File;
  metadataFile: File | null;
  status: DomainUploadStatus;
  error?: string;
}

export interface ScreenshotQueueItem {
  scaffoldId: number;
  scaffoldGroupId: number;
  category: number;
  status: DomainUploadStatus;
}
