import * as XLSX from "xlsx";
import { DescriptorType } from "../../models/descriptorType"; // Adjust the path to your DescriptorType model

type NormalizationOptions = {
    stripParentheses?: boolean;
};

const ABBREVIATION_MAP: Record<string, string> = {
    avg: "average",
    diam: "diameter",
    int: "interior",
    ext: "exterior",
    vol: "volume",
    vols: "volumes",
    frac: "fraction",
    num: "number",
    coord: "coordination",
    pks: "peaks",
    surr: "surrounding",
};

const STOP_WORDS = new Set(["of", "the", "a", "an", "or", "and", "to", "by"]);

const normalizeForLookup = (value: unknown, options: NormalizationOptions = {}): string => {
    if (value == null) return "";

    const { stripParentheses = true } = options;
    const stringValue = String(value);

    let normalized = stringValue
        .replace(/[µμ]/g, "u")
        .replace(/#/g, " number ")
        .replace(/[_:/-]/g, " ")
        .toLowerCase();

    if (stripParentheses) {
        normalized = normalized.replace(/\([^)]*\)/g, " ");
    }

    normalized = normalized.replace(/[^a-z0-9]+/g, " ").trim();
    if (!normalized) return "";

    const tokens = normalized
        .split(/\s+/)
        .map((token) => ABBREVIATION_MAP[token] ?? token)
        .filter((token) => token && !STOP_WORDS.has(token));

    return tokens.join("");
};

const getDescriptorAliases = (descriptor: DescriptorType): string[] => {
    const aliases: string[] = [];

    if (descriptor.label) aliases.push(descriptor.label);
    if (descriptor.tableLabel) aliases.push(descriptor.tableLabel);
    if (descriptor.name) aliases.push(descriptor.name);

    if (descriptor.unit) {
        if (descriptor.label) aliases.push(`${descriptor.label} (${descriptor.unit})`);
        if (descriptor.tableLabel) aliases.push(`${descriptor.tableLabel} (${descriptor.unit})`);
    }

    return aliases;
};

const buildDescriptorLookup = (descriptorTypes: DescriptorType[]): Map<string, DescriptorType> => {
    const lookup = new Map<string, DescriptorType>();

    for (const descriptor of descriptorTypes) {
        for (const alias of getDescriptorAliases(descriptor)) {
            const key = normalizeForLookup(alias);
            if (!key || lookup.has(key)) continue;
            lookup.set(key, descriptor);
        }
    }

    return lookup;
};

const findDescriptor = (
    header: unknown,
    descriptorLookup: Map<string, DescriptorType>
): DescriptorType | undefined => {
    const normalized = normalizeForLookup(header);
    if (!normalized) return undefined;
    return descriptorLookup.get(normalized);
};

const getNumericValues = (values: unknown): number[] => {
    if (!Array.isArray(values)) return [];
    return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
};

const calculateMean = (values: number[]): number | null => {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const calculateStdDev = (values: number[], mean: number): number | null => {
    if (values.length === 0) return null;
    const variance =
        values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
};

// Utility to process Excel file and generate placeholder JSON
export function processExcelFile(file: File, descriptorTypes: DescriptorType[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const descriptorLookup = buildDescriptorLookup(descriptorTypes);

                const scaffolds = workbook.SheetNames
                    .filter(sheetName => !sheetName.toLowerCase().includes("cumulative")) // Skip "Cumulative" sheets
                    .map(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 }); // Convert to 2D array

                        if (!rows || rows.length < 3) {
                            console.warn(`Skipping sheet "${sheetName}" due to insufficient rows.`);
                            return null;
                        }

                        // Parse global descriptors
                        const globalHeaders = rows[0];
                        const globalValues = rows[1];
                        const globalDescriptors = globalHeaders.map((header, index) => {
                            const descriptor = findDescriptor(header, descriptorLookup);
                            if (!descriptor) {
                                throw new Error(`No matching descriptor found for label: ${header}`);
                            }
                            return { name: descriptor.name, value: globalValues[index] };
                        });

                        // Identify "Volume (pL)" column to split Other and Pore descriptors
                        const otherPoreHeaders = rows[2];
                        const volumeIndex = otherPoreHeaders.findIndex((header) => {
                            const descriptor = findDescriptor(header, descriptorLookup);
                            return descriptor?.name === "Volume";
                        });
                        if (volumeIndex === -1) {
                            throw new Error(`"Volume (pL)" column not found in sheet "${sheetName}".`);
                        }

                        // Identify "UniqueId" column
                        const uniqueIdIndex = otherPoreHeaders.findIndex(
                            (header) => normalizeForLookup(header, { stripParentheses: false }) === "uniqueid"
                        );
                        if (uniqueIdIndex === -1) {
                            throw new Error(`"UniqueId" column not found in sheet "${sheetName}".`);
                        }

                        // Extract UniqueId column values
                        const uniqueIds = rows.slice(3).map((row) => row[uniqueIdIndex]).filter((id) => id != null);
                        // if (uniqueIds.length === 0) {
                        //     throw new Error(`No valid entries found in "UniqueId" column of sheet "${sheetName}".`);
                        // }

                        // Parse Other and Pore descriptors
                        const otherDescriptors = [];
                        const poreDescriptors = [];
                        for (let col = 0; col < otherPoreHeaders.length; col++) {
                            const header = otherPoreHeaders[col];
                            const descriptor = findDescriptor(header, descriptorLookup);
                            if (!descriptor) {
                                // Skip unrecognized columns
                                continue;
                            }

                            if (col < volumeIndex) {
                                // Handle Other descriptors (no linking to UniqueId)
                                const values = rows.slice(3).map((row) => row[col]).filter((value) => value != null);
                                otherDescriptors.push({ name: descriptor.name, values });
                            } else {
                                // Handle Pore descriptors (linked to UniqueId)
                                const values = Array.from({ length: uniqueIds.length }, (_, i) => {
                                    const cellValue = rows[3 + i]?.[col];
                                    return cellValue != null ? cellValue : -1;
                                });

                                if (values.length !== uniqueIds.length) {
                                    throw new Error(
                                        `Mismatch between number of rows in "${descriptor.name}" and "UniqueId" in sheet "${sheetName}".`
                                    );
                                }

                                // Link each value with its UniqueId
                                const linkedValues = uniqueIds.map((id, index) => ({
                                    id,
                                    value: values[index], // Fill gaps with -1
                                }));

                                poreDescriptors.push({ name: descriptor.name, values: linkedValues });
                            }
                        }

                        return {
                            globalDescriptors,
                            poreDescriptors,
                            otherDescriptors,
                        };
                    })
                    .filter(Boolean); // Remove null values from skipped sheets

                const inferredSizeDistribution =
                    scaffolds
                        .map((scaffold: any) =>
                            scaffold?.otherDescriptors?.find((descriptor: any) => descriptor?.name === "ParticleDiam")?.values
                        )
                        .find((values: any) => Array.isArray(values) && values.length > 0) ?? ["<NUMBER>"];

                const numericSizeDistribution = getNumericValues(inferredSizeDistribution);
                const inferredMeanSize = calculateMean(numericSizeDistribution);
                const inferredStdDev =
                    inferredMeanSize != null ? calculateStdDev(numericSizeDistribution, inferredMeanSize) : null;
				
				// Check for dx and numVoxels in the global descriptors of the first sheet
				// const firstSheetGlobalDescriptors = scaffolds[0]?.globalDescriptors || [];
				// const dxDescriptor = firstSheetGlobalDescriptors.find(d => d.name.toLowerCase() === "dx");
				// const numVoxelsDescriptor = firstSheetGlobalDescriptors.find(d => d.name.toLowerCase() === "numvoxels");

                // Placeholder for manual input
                const jsonOutput = {
                    isSimulated: "<BOOLEAN: true | false>",
                    inputGroup: {
                        containerShape: "<STRING>",
                        containerSize: null,
                        containerDimensions: "<STRING: optional, e.g. 317.6 x 317.6 x 108.8>",
                        packingConfiguration: "<STRING: isotropic | anisotropic | square | hexagonal | unknown>",
                        particlePropertyGroups: [
                            {
                                shape: "<STRING: spheres | rods | nuggets | ellipsoids | amorphous>",
                                stiffness: "<STRING: rigid | semisoft | soft>",
                                friction: "<STRING>",
                                dispersity: "<STRING: monodisperse | polydisperse>",
                                sizeDistributionType: "<STRING: gaussian | binomial | poisson | uniform>",
                                meanSize: inferredMeanSize ?? "<NUMBER>",
                                standardDeviationSize: inferredStdDev ?? "<NUMBER>",
                                proportion: "<NUMBER>"
                            }
                        ],
                        sizeDistribution: inferredSizeDistribution
                    },
                    scaffolds
                };

                resolve(jsonOutput);
            } catch (error) {
                console.error("Error processing Excel file:", error);
                reject(error);
            }
        };

        reader.onerror = (e) => {
            console.error("Error reading Excel file:", e);
            reject(e);
        };

        reader.readAsArrayBuffer(file);
    });
}
