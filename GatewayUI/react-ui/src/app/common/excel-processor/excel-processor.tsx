import * as XLSX from "xlsx";
import { DescriptorType } from "../../models/descriptorType"; // Adjust the path to your DescriptorType model

// Utility to process Excel file and generate placeholder JSON
export function processExcelFile(file: File, descriptorTypes: DescriptorType[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });

                const normalize = (str: string) => str.replace(/\s+/g, "").toLowerCase();

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
                            const descriptor = descriptorTypes.find((d) => normalize(d.label) === normalize(header));
                            if (!descriptor) {
                                throw new Error(`No matching descriptor found for label: ${header}`);
                            }
                            return { name: descriptor.name, value: globalValues[index] };
                        });

                        // Identify "Volume (pL)" column to split Other and Pore descriptors
                        const otherPoreHeaders = rows[2];
                        const volumeIndex = otherPoreHeaders.findIndex((header) => normalize(header) === "volume(pl)");
                        if (volumeIndex === -1) {
                            throw new Error(`"Volume (pL)" column not found in sheet "${sheetName}".`);
                        }

                        // Identify "UniqueId" column
                        const uniqueIdIndex = otherPoreHeaders.findIndex((header) => normalize(header) === "uniqueid");
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
                            const normalizedHeader = normalize(header);
                            const descriptor = descriptorTypes.find((d) => normalize(d.label) === normalizedHeader);
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
				
				// Check for dx and numVoxels in the global descriptors of the first sheet
				// const firstSheetGlobalDescriptors = scaffolds[0]?.globalDescriptors || [];
				// const dxDescriptor = firstSheetGlobalDescriptors.find(d => d.name.toLowerCase() === "dx");
				// const numVoxelsDescriptor = firstSheetGlobalDescriptors.find(d => d.name.toLowerCase() === "numvoxels");

                // Placeholder for manual input
                const jsonOutput = {
                    isSimulated: "<BOOLEAN: true | false>",
                    inputGroup: {
                        containerShape: "<STRING>",
                        containerSize: "<NUMBER>",
                        packingConfiguration: "<STRING: isotropic | anisotropic | square | hexagonal | unknown>",
                        particlePropertyGroups: [
                            {
                                shape: "<STRING: spheres | rods | nuggets | ellipsoids | amorphous>",
                                stiffness: "<STRING: rigid | semisoft | soft>",
                                friction: "<STRING>",
                                dispersity: "<STRING: monodisperse | polydisperse>",
                                sizeDistributionType: "<STRING: gaussian | binomial | poisson | uniform>",
                                meanSize: "<NUMBER>",
                                standardDeviationSize: "<NUMBER>",
                                proportion: "<NUMBER>"
                            }
                        ],
                        sizeDistribution: ["<NUMBER>"]
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
