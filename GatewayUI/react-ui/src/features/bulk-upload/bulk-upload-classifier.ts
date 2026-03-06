import {
  ClassifiedFile,
  ClassificationResult,
  FileRole,
  ScaffoldSlot,
} from "./bulk-upload-types";

/**
 * Classify a single file by its name and extension.
 */
export function classifyFile(file: File): ClassifiedFile {
  const name = file.name;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const stem = name.replace(/\.[^.]+$/, ""); // filename without extension

  // 1. Excel
  if (ext === "xlsx" || ext === "xls") {
    return { file, role: FileRole.Excel, scaffoldKey: null, scaffoldIndex: null };
  }

  // 2-3. GLB files
  if (ext === "glb") {
    const hasAt = name.includes("@");
    const role = hasAt ? FileRole.PoreMesh : FileRole.ParticleMesh;
    const { key, index } = extractScaffoldInfo(stem, hasAt);
    return { file, role, scaffoldKey: key, scaffoldIndex: index };
  }

  // 4-6. JSON files
  if (ext === "json") {
    const hasMetadata = stem.toLowerCase().includes("_metadata");
    const hasAt = name.includes("@");

    if (hasMetadata) {
      const role = hasAt ? FileRole.PoreMetadata : FileRole.ParticleMetadata;
      const cleanStem = stem.replace(/_metadata$/i, "");
      const { key, index } = extractScaffoldInfo(cleanStem, hasAt);
      return { file, role, scaffoldKey: key, scaffoldIndex: index };
    }

    // Non-metadata JSON — try to detect descriptor
    return { file, role: FileRole.Unknown, scaffoldKey: null, scaffoldIndex: null };
  }

  return { file, role: FileRole.Unknown, scaffoldKey: null, scaffoldIndex: null };
}

/**
 * Extract scaffold key and numeric index from a filename stem.
 *
 * Tries multiple patterns in order of specificity:
 *   1. Pure numeric suffix:     `_3`   → index 3
 *   2. Prefixed numeric suffix: `_v1`, `_V2`, `_r3`, `_rep5` → extract trailing number
 *   3. Fallback: scan for last segment containing any digits and extract them
 *
 * For pore files (has @): same patterns but anchored before the `@`.
 * The scaffold "key" = everything before the matched suffix segment.
 */
function extractScaffoldInfo(
  stem: string,
  hasAt: boolean
): { key: string; index: number | null } {
  // The part we parse depends on whether there's an @ (pore identifier)
  const subject = hasAt ? stem.split("@")[0] : stem;

  // Pattern 1: pure numeric suffix  e.g. "groupName_3"
  const pureMatch = subject.match(/^(.+?)_(\d+)$/);
  if (pureMatch) {
    return { key: normalizeKey(pureMatch[1]), index: parseInt(pureMatch[2], 10) };
  }

  // Pattern 2: alpha-prefixed numeric suffix  e.g. "groupName_v1", "groupName_rep3", "groupName_V02"
  const prefixedMatch = subject.match(/^(.+?)_[a-zA-Z]+(\d+)$/);
  if (prefixedMatch) {
    return { key: normalizeKey(prefixedMatch[1]), index: parseInt(prefixedMatch[2], 10) };
  }

  // Pattern 3: last underscore-separated segment that contains digits anywhere
  const segments = subject.split("_");
  if (segments.length >= 2) {
    const lastSeg = segments[segments.length - 1];
    const digits = lastSeg.match(/(\d+)/);
    if (digits) {
      const key = segments.slice(0, -1).join("_");
      return { key: normalizeKey(key), index: parseInt(digits[1], 10) };
    }
  }

  return { key: normalizeKey(stem), index: null };
}

/**
 * Normalize key so that `{40,100}` matches `{40_100}`.
 * Replace commas inside braces with underscores.
 */
function normalizeKey(raw: string): string {
  return raw.replace(/\{([^}]*)\}/g, (_match, inner: string) =>
    `{${inner.replace(/,/g, "_")}}`
  );
}

/**
 * Try to detect if a JSON file is a descriptor (has `inputGroup` + `scaffolds` array).
 */
export async function detectDescriptorJson(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Could be an array of ScaffoldGroupToCreate or a single one
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;
    return obj && typeof obj === "object" && "inputGroup" in obj && "scaffolds" in obj;
  } catch {
    return false;
  }
}

/**
 * Classify all dropped files and group them into scaffold slots.
 */
export async function classifyAndGroup(files: File[]): Promise<ClassificationResult> {
  // Step 1: classify each file
  const classified = files.map(classifyFile);

  // Step 2: resolve Unknown JSONs — check if they're descriptors
  let descriptorFile: ClassifiedFile | null = null;
  const resolvedFiles: ClassifiedFile[] = [];

  for (const cf of classified) {
    if (cf.role === FileRole.Unknown && cf.file.name.endsWith(".json")) {
      const isDescriptor = await detectDescriptorJson(cf.file);
      if (isDescriptor && !descriptorFile) {
        resolvedFiles.push({ ...cf, role: FileRole.Descriptor });
        continue;
      }
    }
    resolvedFiles.push(cf);
  }

  // Step 3: separate descriptor + Excel from domain files
  const domainFiles: ClassifiedFile[] = [];
  const unassignedFiles: ClassifiedFile[] = [];

  for (const cf of resolvedFiles) {
    if (cf.role === FileRole.Descriptor) {
      if (!descriptorFile) {
        descriptorFile = cf;
      } else {
        unassignedFiles.push(cf);
      }
    } else if (cf.role === FileRole.Excel) {
      // Excel becomes the descriptor if no JSON descriptor exists
      if (!descriptorFile) {
        descriptorFile = cf;
      } else {
        unassignedFiles.push(cf);
      }
    } else if (cf.role === FileRole.Unknown) {
      unassignedFiles.push(cf);
    } else if (cf.scaffoldKey !== null && cf.scaffoldIndex !== null) {
      domainFiles.push(cf);
    } else {
      unassignedFiles.push(cf);
    }
  }

  // Step 4: group domain files into scaffold slots
  const slotMap = new Map<string, ScaffoldSlot>();

  for (const cf of domainFiles) {
    const slotId = `${cf.scaffoldKey}__${cf.scaffoldIndex}`;

    if (!slotMap.has(slotId)) {
      slotMap.set(slotId, {
        key: cf.scaffoldKey!,
        index: cf.scaffoldIndex!,
        particleMesh: null,
        poreMesh: null,
        particleMetadata: null,
        poreMetadata: null,
      });
    }

    const slot = slotMap.get(slotId)!;
    const field = roleToSlotField(cf.role);

    if (field) {
      if (slot[field] === null) {
        slot[field] = cf;
      } else {
        // Conflict — second file goes to unassigned
        unassignedFiles.push(cf);
      }
    } else {
      unassignedFiles.push(cf);
    }
  }

  // Sort slots by index
  const slots = Array.from(slotMap.values()).sort((a, b) => a.index - b.index);

  return { descriptorFile, slots, unassignedFiles };
}

function roleToSlotField(
  role: FileRole
): keyof Pick<ScaffoldSlot, "particleMesh" | "poreMesh" | "particleMetadata" | "poreMetadata"> | null {
  switch (role) {
    case FileRole.ParticleMesh:
      return "particleMesh";
    case FileRole.PoreMesh:
      return "poreMesh";
    case FileRole.ParticleMetadata:
      return "particleMetadata";
    case FileRole.PoreMetadata:
      return "poreMetadata";
    default:
      return null;
  }
}
