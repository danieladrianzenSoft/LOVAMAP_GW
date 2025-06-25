import * as XLSX from 'xlsx';
import { ScaffoldGroup } from '../../models/scaffoldGroup';
import { Descriptor } from '../../models/descriptor';
import { DescriptorType } from '../../models/descriptorType';
import { Scaffold } from '../../models/scaffold';

const headingCharacterLength = 30;

export function downloadScaffoldGroupAsExcel(scaffoldGroup: ScaffoldGroup) {
    const wb = XLSX.utils.book_new();

    // General Info and Input Group Info combined
    const generalInfo = [
        ["ID", scaffoldGroup.id],
        ["Name", scaffoldGroup.name],
        ["Simulated", scaffoldGroup.isSimulated.toString().toLowerCase()],
        ["Number of Replicates", scaffoldGroup.numReplicates],
        [], // Adding an empty row for spacing
        ["Scaffold Inputs"],
        ["Container Shape", scaffoldGroup.inputs.containerShape ?? 'n/a'],
        ["Container Size", scaffoldGroup.inputs.containerSize ?? 'n/a'],
        ["Packing Configuration", scaffoldGroup.inputs.packingConfiguration.toString().toLowerCase()],
        [], // Another empty row for spacing
        ["Particle Properties"]
    ];

    // Particle Properties Header and Data
    const particlesHeader = ["Shape", "Stiffness", "Dispersity", "Size Distribution Type", "Mean Size", "Standard Deviation Size", "Proportion"];
    const particlesData = scaffoldGroup.inputs.particles.map(p => [
        p.shape, p.stiffness, p.dispersity, p.sizeDistributionType, p.meanSize, p.standardDeviationSize, p.proportion
    ]);

    // Append header and data to generalInfo
    generalInfo.push(particlesHeader);
    generalInfo.push(...particlesData); // Spread operator to add each particle info row

    // Convert array of arrays into a worksheet
    const ws = XLSX.utils.aoa_to_sheet(generalInfo);
    XLSX.utils.book_append_sheet(wb, ws, 'General Info');

    scaffoldGroup.scaffolds.forEach(scaffold => {
        const ws = XLSX.utils.aoa_to_sheet([]);

        // Global Descriptors at the very top
        const globalHeaders = scaffold.globalDescriptors.map(desc => 
            `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
        const globalValues = scaffold.globalDescriptors.map(desc => desc.values);
        XLSX.utils.sheet_add_aoa(ws, [["Global Descriptors"]], { origin: { r: 0, c: 0 } });
        XLSX.utils.sheet_add_aoa(ws, [globalHeaders], { origin: { r: 1, c: 0 } }); // Place headers at row 1
        XLSX.utils.sheet_add_aoa(ws, [globalValues], { origin: { r: 2, c: 0 } }); // Place values at row 2

        const descriptorsStartRow = 4; // Global descriptors take up 2 rows, start next section from row 3

        // Other Descriptors below Global Descriptors
        let nextColStart = 0; // Track the next start column for Pore Descriptors
        if (scaffold.otherDescriptors.length > 0) {
            const { data, maxCol } = layoutDescriptors(scaffold.otherDescriptors, false);
            XLSX.utils.sheet_add_aoa(ws, [["Other Descriptors"]], { origin: { r: descriptorsStartRow, c: 0 } });
            XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: descriptorsStartRow+1, c: 0 } });
            nextColStart = maxCol; // Update next column start for Pore Descriptors
        }

        // Pore Descriptors right after Other Descriptors
        if (scaffold.poreDescriptors.length > 0) {
            const { data } = layoutDescriptors(scaffold.poreDescriptors, true);
            XLSX.utils.sheet_add_aoa(ws, [["Pore Descriptors"]], { origin: { r: descriptorsStartRow, c: nextColStart } });
            XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: descriptorsStartRow+1, c: nextColStart } });
        }

        const sheetName = `Replicate ${scaffold.replicateNumber}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

    });

    // XLSX.writeFile(wb, `${scaffoldGroup.name.replace(/\s+/g, '_').slice(0,headingCharacterLength)}.xlsx`);
    const filename = `${scaffoldGroup.name.replace(/\s+/g, '_').slice(0,headingCharacterLength)}.xlsx`;
    return {file: wb, filename: filename};
}

function writeSingleReplicateSheetLikeDownload(
    ws: XLSX.WorkSheet,
    scaffoldGroup: ScaffoldGroup,
    replicateIndex: number
): void {
    const scaffold = scaffoldGroup.scaffolds[replicateIndex];
    if (!scaffold) return;

    // === Global Descriptors ===
    const globalHeaders = scaffold.globalDescriptors.map(desc =>
        `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`
    );
    const globalValues = scaffold.globalDescriptors.map(desc => desc.values);
    XLSX.utils.sheet_add_aoa(ws, [["Global Descriptors"]], { origin: { r: 0, c: 0 } });
    XLSX.utils.sheet_add_aoa(ws, [globalHeaders], { origin: { r: 1, c: 0 } });
    XLSX.utils.sheet_add_aoa(ws, [globalValues], { origin: { r: 2, c: 0 } });

    let currentRow = 4;

    // === Other Descriptors ===
    let colStart = 0;
    if (scaffold.otherDescriptors.length > 0) {
        const { data, maxCol } = layoutDescriptors(scaffold.otherDescriptors, false);
        XLSX.utils.sheet_add_aoa(ws, [["Other Descriptors"]], { origin: { r: currentRow, c: 0 } });
        XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: currentRow + 1, c: 0 } });
        colStart = maxCol;
    }

    // === Pore Descriptors ===
    if (scaffold.poreDescriptors.length > 0) {
        const { data } = layoutDescriptors(scaffold.poreDescriptors, true);
        XLSX.utils.sheet_add_aoa(ws, [["Pore Descriptors"]], { origin: { r: currentRow, c: colStart } });
        XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: currentRow + 1, c: colStart } });
    }
}

export function triggerDownload(wb: XLSX.WorkBook, filename: string) {
    XLSX.writeFile(wb, filename);
}

export function downloadExperimentsAsExcel(
    selectedScaffoldGroups: ScaffoldGroup[],
    selectedDescriptorTypes: DescriptorType[],
    options: {
        excelFileOption: string;
        sheetOption: string;
        columnOption: string;
        stackedColumnOption: string;
    }
) {
    const createGeneralInfoWorksheet = (scaffoldGroups: ScaffoldGroup[], key?: number | null) => {
        const generalInfoData: any[][] = [];
        scaffoldGroups.forEach((scaffoldGroup, index) => {
            const scaffoldGroupInfo = [
                ["Key", `Scaffold Group ${key != null ? key + 1 : index + 1}`],
                ["ID", scaffoldGroup.id],
                ["Name", scaffoldGroup.name],
                ["Simulated", scaffoldGroup.isSimulated.toString().toLowerCase()],
                ["Number of Replicates", scaffoldGroup.numReplicates],
                [],
                ["Scaffold Inputs"],
                ["Container Shape", scaffoldGroup.inputs.containerShape ?? 'n/a'],
                ["Container Size", scaffoldGroup.inputs.containerSize ?? 'n/a'],
                ["Packing Configuration", scaffoldGroup.inputs.packingConfiguration.toString().toLowerCase()],
                [],
                ["Particle Properties"]
            ];

            const particlesHeader = ["Shape", "Stiffness", "Dispersity", "Size Distribution Type", "Mean Size", "Standard Deviation Size", "Proportion"];
            const particlesData = scaffoldGroup.inputs.particles.map(p => [
                p.shape, p.stiffness, p.dispersity, p.sizeDistributionType, p.meanSize, p.standardDeviationSize, p.proportion
            ]);

            scaffoldGroupInfo.push(particlesHeader);
            scaffoldGroupInfo.push(...particlesData);
            scaffoldGroupInfo.push([], []); // Add empty rows for spacing between scaffold groups

            generalInfoData.push(...scaffoldGroupInfo);
        });

        return XLSX.utils.aoa_to_sheet(generalInfoData);
    };

    const addDataToWorksheet = (ws: XLSX.WorkSheet, data: any[][], startRow: number, startCol: number) => {
        XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: startRow, c: startCol } });
    };

    const getDescriptorData = (scaffold: Scaffold, descriptorTypeId: number, descriptorCategory: string) => {
        let result: any[] = [];
        switch (descriptorCategory.toLowerCase()) {
            case 'global':
                result = scaffold.globalDescriptors.filter(d => d.descriptorTypeId === descriptorTypeId);
                break;
            case 'pore':
                result = scaffold.poreDescriptors.filter(d => d.descriptorTypeId === descriptorTypeId);
                break;
            case 'other':
                result = scaffold.otherDescriptors.filter(d => d.descriptorTypeId === descriptorTypeId);
                break;
            default:
                result = [];
        }

        return result;
    };

    const createDescriptorWorksheet = (
        scaffoldGroup: ScaffoldGroup,
        descriptors: DescriptorType[],
        entityLabel: string,
        replicateIndex?: number
    ) => {
        const ws = XLSX.utils.aoa_to_sheet([]);
        let currentRow = 0;

        scaffoldGroup.scaffolds.forEach((scaffold, scaffoldIndex) => {
            descriptors.forEach(descriptor => {
                const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);

                if (descriptorData.length > 0) {
                    const label = `${descriptor.label}${descriptor.unit ? ' (' + descriptor.unit + ')' : ''}`;
                    const header = [entityLabel, label, 'PoreId'];
                    addDataToWorksheet(ws, [header], currentRow, 0);
                    currentRow++;

                    descriptorData.forEach(desc => {
                        const pairs: string[] = typeof desc.values === 'string'
                            ? desc.values.split(';').map((pair: string) => pair.trim())
                            : [];

                        pairs.forEach(pair => {
                            const [idPart, valuePart] = pair.split(',').map(s => s.trim());
                            if (idPart && valuePart) {
                                const labelVal = replicateIndex !== undefined
                                    ? `Replicate ${replicateIndex + 1}`
                                    : `Scaffold ${scaffoldIndex + 1}`;

                                const row = [labelVal, valuePart, idPart];
                                addDataToWorksheet(ws, [row], currentRow, 0);
                                currentRow++;
                            }
                        });
                    });

                    currentRow++; // spacing between descriptors
                }
            });
        });

        return ws;
    };

    const createDescriptorWorksheetWithColumns = (
        scaffoldGroup: ScaffoldGroup,
        descriptors: DescriptorType[],
        entityLabel: string,
        columnOption: string,
        replicateIndex?: number
    ) => {
        const ws = XLSX.utils.aoa_to_sheet([]);
        let currentRow = 0;

        scaffoldGroup.scaffolds.forEach((scaffold, scaffoldIndex) => {
            const globalDescriptors = scaffold.globalDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));
            const poreDescriptors = scaffold.poreDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));
            const otherDescriptors = scaffold.otherDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));

            if (globalDescriptors.length > 0) {
                const globalHeaders = globalDescriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
                const globalValues = globalDescriptors.map(desc => desc.values);
                addDataToWorksheet(ws, [["Global Descriptors"]], currentRow, 0);
                addDataToWorksheet(ws, [globalHeaders], currentRow + 1, 0);
                addDataToWorksheet(ws, [globalValues], currentRow + 2, 0);
                currentRow += 4; // Move to next section
            }

            let colStart = 0

            if (otherDescriptors.length > 0) {
                const { data, maxCol } = layoutDescriptors(otherDescriptors, false);
                addDataToWorksheet(ws, [["Other Descriptors"]], currentRow, 0);
                addDataToWorksheet(ws, data, currentRow + 1, 0);
                // currentRow += data.length + 1; // Move to next section
                colStart = maxCol
            }

            if (poreDescriptors.length > 0) {
                const includePoreId = columnOption === 'Descriptors'; // Only show PoreId in this case
                const { data, maxCol } = layoutDescriptors(poreDescriptors, includePoreId);
                addDataToWorksheet(ws, [["Pore Descriptors"]], currentRow, colStart);
                addDataToWorksheet(ws, data, currentRow + 1, colStart);
                colStart += maxCol;
            }
        });

        return ws;
    };

    const createWorkbook = (
        scaffoldGroups: ScaffoldGroup[],
        descriptors: DescriptorType[],
        sheetOption: string,
        columnOption: string,
        fileName: string
    ) => {
        scaffoldGroups.forEach((scaffoldGroup, groupIndex) => {
            const wb = XLSX.utils.book_new();

            // Add General Info worksheet
            const generalInfoWs = createGeneralInfoWorksheet([scaffoldGroup], groupIndex);
            XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');

            if (sheetOption === 'Descriptors') {
                descriptors.forEach(descriptor => {
                    const ws = createDescriptorWorksheet(scaffoldGroup, [descriptor], 'Scaffold Group');
                    XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0,headingCharacterLength)}`);
                });
            } else if (sheetOption === 'Scaffold Replicates') {
                scaffoldGroup.scaffolds.forEach((_, replicateIndex) => {
                    if (columnOption === 'Descriptors') {
                        // const ws = createDescriptorWorksheetWithColumns(scaffoldGroup, descriptors, 'Replicate', replicateIndex);
                        const ws = createDescriptorWorksheetWithColumns(
                            { ...scaffoldGroup, scaffolds: [scaffoldGroup.scaffolds[replicateIndex]] },
                            descriptors,
                            'Replicate',
                            columnOption,
                            replicateIndex
                        );
                        XLSX.utils.book_append_sheet(wb, ws, `Replicate ${replicateIndex + 1}`);
                    } else {
                        // const ws = createDescriptorWorksheet(scaffoldGroup, descriptors, 'Replicate', replicateIndex);
                        const ws = createDescriptorWorksheet(
                            { ...scaffoldGroup, scaffolds: [scaffoldGroup.scaffolds[replicateIndex]] },
                            descriptors,
                            'Replicate',
                            replicateIndex
                        );
                        XLSX.utils.book_append_sheet(wb, ws, `Replicate ${replicateIndex + 1}`);
                    }
                });
            } else {
                if (columnOption === 'Descriptors') {
                    const ws = createDescriptorWorksheetWithColumns(scaffoldGroup, descriptors, 'Scaffold Group', columnOption);
                    XLSX.utils.book_append_sheet(wb, ws, 'Data');
                } else {
                    const ws = createDescriptorWorksheet(scaffoldGroup, descriptors, 'Data');
                    XLSX.utils.book_append_sheet(wb, ws, 'Data');
                }
            }

            // Save the workbook
            XLSX.writeFile(wb, `${fileName}_ScaffoldGroup${groupIndex + 1}.xlsx`);
        });
    };

    const createStackedWorkbook = (
        scaffoldGroups: ScaffoldGroup[],
        descriptors: DescriptorType[],
        fileName: string,
        options: {
            columnOption: string;
            sheetOption: string;
            excelFileOption: string;
            stackedColumnOption: string;
        }
    ) => {
        const wb = XLSX.utils.book_new();
    
        // Add a single general info worksheet that covers all scaffold groups
        const generalInfoWs = createGeneralInfoWorksheet(scaffoldGroups);
        XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    
        if (
            options.columnOption === 'Scaffold Groups' &&
            options.sheetOption === 'Descriptors' &&
            options.excelFileOption === 'Scaffold Replicates' &&
            options.stackedColumnOption === 'True'
        ) {
            descriptors.forEach(descriptor => {
            const ws = XLSX.utils.aoa_to_sheet([]);
            const headers = ['Replicate', ...scaffoldGroups.map(g => `Scaffold Group ${g.id}`)];
            XLSX.utils.sheet_add_aoa(ws, [headers], { origin: { r: 0, c: 0 } });

            let currentRow = 1;
            const maxReplicates = Math.max(...scaffoldGroups.map(g => g.scaffolds.length));

            for (let replicateIndex = 0; replicateIndex < maxReplicates; replicateIndex++) {
                // Determine the number of rows to write based on the longest descriptor
                const rows: any[][] = [];

                // First column = replicate
                let maxDepth = 0;

                scaffoldGroups.forEach((group, colIndex) => {
                    const scaffold = group.scaffolds[replicateIndex];
                    if (!scaffold) return;

                    const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
                    let values: string[] = [];

                    if (descriptorData.length > 0 && typeof descriptorData[0].values === 'string') {
                    const first = descriptorData[0].values.split(';')[0];
                    const isIdVal = first.includes(',') && /^[^,]+,[^,]+$/.test(first.trim());

                    if (isIdVal) {
                        values = descriptorData[0].values
                        .split(';')
                        .map((p: string) => p.trim())
                        .map((p: string) => p.split(',')[1]?.trim() ?? '');
                    } else {
                        values = descriptorData[0].values.split(',').map((s: string) => s.trim());
                    }
                    }

                    maxDepth = Math.max(maxDepth, values.length);

                    values.forEach((val, i) => {
                    if (!rows[i]) rows[i] = new Array(scaffoldGroups.length + 1).fill('');
                        rows[i][colIndex + 1] = val; // +1 for replicate column
                    });
                });

                // Prepend replicate number
                rows.forEach(r => r[0] = replicateIndex + 1);
                XLSX.utils.sheet_add_aoa(ws, rows, { origin: { r: currentRow, c: 0 } });
                currentRow += rows.length;
                }

                XLSX.utils.book_append_sheet(wb, ws, descriptor.label.slice(0, 31));
            });

            XLSX.writeFile(wb, `${fileName}_Stacked.xlsx`);
            return;
        } else if (
            options.columnOption === 'Descriptors' &&
            options.sheetOption === 'Scaffold Groups' &&
            options.excelFileOption === 'Scaffold Replicates' &&
            options.stackedColumnOption === 'True'
            ) {
                console.log("[DEBUG] TRIGGERING STACKED SCAFFOLD GROUP LAYOUT LIKE downloadScaffoldGroupAsExcel");

                scaffoldGroups.forEach((scaffoldGroup) => {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    writeStackedGroupSheetLikeDownload(ws, scaffoldGroup); // This is your adapted layout
                    const name = `Scaffold Group ${scaffoldGroup.id}`.slice(0, 31);
                    XLSX.utils.book_append_sheet(wb, ws, name);
                });
            }        
        else {
            console.log("[DEBUG] TRIGGERING NON-STACKED SCAFFOLD GROUPS")
            // Original logic for other cases
            scaffoldGroups.forEach((scaffoldGroup) => {
                const ws = XLSX.utils.aoa_to_sheet([]);
                
                // Add a header row: 'Replicate', followed by each descriptor's label
                const tableHeaders = ['Replicate', ...descriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`)];
                XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
                
                let currentRow = 1; // Start adding data from the first row below headers
        
                scaffoldGroup.scaffolds.forEach((scaffold, replicateIndex) => {
                    const rowData: any[][] = [];
        
                    // Add 'Replicate' column data
                    const replicateColumn = `${replicateIndex + 1}`;
        
                    descriptors.forEach((descriptor, descriptorIndex) => {
                        const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
                        const valueRows: string[] = [];

                        if (descriptorData.length > 0 && typeof descriptorData[0].values === 'string') {
                            const pairs = descriptorData[0].values.split(';').map((pair: string) => pair.trim());
                            for (const pair of pairs) {
                                const parts = pair.split(',').map((s: string) => s.trim());
                                if (parts.length === 2) {
                                    const [, value] = parts;
                                    if (value) valueRows.push(value);
                                }
                            }
                        }

                        valueRows.forEach((value: string, valueIndex: number) => {
                            if (!rowData[valueIndex]) {
                                rowData[valueIndex] = [replicateColumn];
                            }
                            rowData[valueIndex][descriptorIndex + 1] = value;
                        });
                    });
        
                    // Add each row to the worksheet
                    rowData.forEach((row, rowIndex) => {
                        XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: currentRow + rowIndex, c: 0 } });
                    });
        
                    currentRow += rowData.length; // Move the currentRow pointer for the next set of data
                });
        
                // Add the worksheet to the workbook with a name based on the scaffold group ID
                XLSX.utils.book_append_sheet(wb, ws, `Scaffold Group ${scaffoldGroup.id}`);
            });
        }
    
        // Save the workbook as a single file
        XLSX.writeFile(wb, `${fileName}_Replicates.xlsx`);
    };

    function writeStackedGroupSheetLikeDownload(ws: XLSX.WorkSheet, scaffoldGroup: ScaffoldGroup): void {
        let currentRow = 0;

        // === GLOBAL DESCRIPTORS ===
        const globalDescriptors = scaffoldGroup.scaffolds[0]?.globalDescriptors ?? [];
        if (globalDescriptors.length > 0) {
            const headers = ['Replicate', ...globalDescriptors.map(desc =>
                `${desc.label}${desc.unit ? ` (${desc.unit})` : ''}`
            )];

            const rows = scaffoldGroup.scaffolds.map(scaffold => [
                scaffold.replicateNumber,
                ...scaffold.globalDescriptors.map(desc => desc.values)
            ]);

            XLSX.utils.sheet_add_aoa(ws, [['Global Descriptors']], { origin: { r: currentRow++, c: 0 } });
            XLSX.utils.sheet_add_aoa(ws, [headers], { origin: { r: currentRow++, c: 0 } });
            XLSX.utils.sheet_add_aoa(ws, rows, { origin: { r: currentRow, c: 0 } });
            currentRow += rows.length + 1;
        }

        // === STACKED OTHER + PORE DESCRIPTORS ===
        scaffoldGroup.scaffolds.forEach((scaffold, index) => {
            const startRow = currentRow;

            // Other Descriptors
            let colStart = 0;
            if (scaffold.otherDescriptors.length > 0) {
                const { data, maxCol } = layoutDescriptors(scaffold.otherDescriptors, false);
                if (data.length > 1) {
                    // Insert 'Replicate' column as first column
                    data[0].unshift('Replicate');
                    for (let r = 1; r < data.length; r++) {
                        data[r].unshift(scaffold.replicateNumber);
                    }

                    XLSX.utils.sheet_add_aoa(ws, [[`Other Descriptors`]], { origin: { r: currentRow++, c: 0 } });
                    XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: currentRow, c: 0 } });
                    currentRow += data.length + 1;
                    colStart = maxCol + 1;
                }
            }

            // Pore Descriptors
            if (scaffold.poreDescriptors.length > 0) {
                const { data } = layoutDescriptors(scaffold.poreDescriptors, true);
                if (data.length > 1) {
                    // Insert 'Replicate' column as first column
                    data[0].unshift('Replicate');
                    for (let r = 1; r < data.length; r++) {
                        data[r].unshift(scaffold.replicateNumber);
                    }

                    XLSX.utils.sheet_add_aoa(ws, [[`Pore Descriptors`]], { origin: { r: startRow, c: colStart } });
                    XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: startRow + 1, c: colStart } });
                    currentRow = Math.max(currentRow, startRow + 1 + data.length + 1);
                }
            }

            currentRow++;
        });
    }

    function writeStackedScaffoldGroupSheet(
        ws: XLSX.WorkSheet,
        scaffoldGroup: ScaffoldGroup,
        descriptors: DescriptorType[],
        startRow: number = 0
    ): number {
        let currentRow = startRow;

        const globalTypes = descriptors.filter(d => d.category === 'global');
        const otherTypes = descriptors.filter(d => d.category === 'other');
        const poreTypes = descriptors.filter(d => d.category === 'pore');

        // --- GLOBAL DESCRIPTORS ---
        if (globalTypes.length > 0) {
            const headers = ['Replicate', ...globalTypes.map(d => `${d.label}${d.unit ? ` (${d.unit})` : ''}`)];
            const rows: any[][] = [];

            scaffoldGroup.scaffolds.forEach((scaffold, replicateIndex) => {
                const row: (string | number)[] = [replicateIndex + 1];
                globalTypes.forEach(d => {
                    const data = getDescriptorData(scaffold, d.id, d.category);
                    row.push(data.length > 0 ? data[0].values : '');
                });
                rows.push(row);
            });

            addDataToWorksheet(ws, [['Global Descriptors']], currentRow++, 0);
            addDataToWorksheet(ws, [headers], currentRow++, 0);
            rows.forEach(row => addDataToWorksheet(ws, [row], currentRow++, 0));
            currentRow++;
        }

        // --- OTHER + PORE DESCRIPTORS ---
        const otherHeaders = ['Replicate', ...otherTypes.map(d => `${d.label}${d.unit ? ` (${d.unit})` : ''}`)];
        const poreHeaders = [...poreTypes.map(d => `${d.label}${d.unit ? ` (${d.unit})` : ''}`), 'PoreId'];

        const otherRows: any[][] = [];
        const poreRows: any[][] = [];

        scaffoldGroup.scaffolds.forEach((scaffold, replicateIndex) => {
            const rep = replicateIndex + 1;

            // Other descriptors
            const otherRow: (string | number)[] = [rep];
            otherTypes.forEach(d => {
                const data = getDescriptorData(scaffold, d.id, d.category);
                otherRow.push(data.length > 0 ? data[0].values : '');
            });
            otherRows.push(otherRow);

            // Pore descriptors
            const poreMatrix: Record<string, string[]> = {};
            let poreIds: string[] = [];

            poreTypes.forEach(d => {
                const data = getDescriptorData(scaffold, d.id, d.category);
                if (data.length > 0 && typeof data[0].values === 'string') {
                    const pairs = data[0].values.split(';').map((pair: string) => pair.trim());
                    pairs.forEach((pair: string, idx: number) => {
                        const [id, value] = pair.split(',').map((s: string) => s.trim());
                        if (!poreMatrix[d.label]) poreMatrix[d.label] = [];
                        poreMatrix[d.label][idx] = value;
                        if (!poreIds[idx]) poreIds[idx] = id;
                    });
                }
            });

            poreIds.forEach((poreId, idx) => {
                const row: (string | number)[] = [rep];
                poreTypes.forEach(d => {
                    row.push(poreMatrix[d.label]?.[idx] ?? '');
                });
                row.push(poreId);
                poreRows.push(row);
            });
        });

        // --- Write Other Descriptors ---
        if (otherTypes.length > 0) {
            addDataToWorksheet(ws, [['Other Descriptors']], currentRow++, 0);
            addDataToWorksheet(ws, [otherHeaders], currentRow++, 0);
            otherRows.forEach(row => addDataToWorksheet(ws, [row], currentRow++, 0));
            currentRow++;
        }

        // --- Write Pore Descriptors ---
        if (poreTypes.length > 0) {
            addDataToWorksheet(ws, [['Pore Descriptors']], currentRow++, 0);
            addDataToWorksheet(ws, [poreHeaders], currentRow++, 0);
            poreRows.forEach(row => addDataToWorksheet(ws, [row], currentRow++, 0));
        }

        return currentRow;
    }

    function writeStackedScaffoldGroupDescriptorSheet(
        ws: XLSX.WorkSheet,
        scaffoldGroup: ScaffoldGroup
    ): void {
        let currentRow = 0;

        // === GLOBAL DESCRIPTORS ===
        const globalDescriptors = scaffoldGroup.scaffolds[0]?.globalDescriptors ?? [];
        if (globalDescriptors.length > 0) {
            const headers = ['Replicate', ...globalDescriptors.map(desc =>
                `${desc.label}${desc.unit ? ` (${desc.unit})` : ''}`
            )];

            const data = scaffoldGroup.scaffolds.map((scaffold, index) => {
                return [
                    scaffold.replicateNumber,
                    ...scaffold.globalDescriptors.map(desc => desc.values)
                ];
            });

            XLSX.utils.sheet_add_aoa(ws, [['Global Descriptors']], { origin: { r: currentRow++, c: 0 } });
            XLSX.utils.sheet_add_aoa(ws, [headers], { origin: { r: currentRow++, c: 0 } });
            XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: currentRow, c: 0 } });
            currentRow += data.length + 1;
        }

        // === OTHER AND PORE DESCRIPTORS STACKED BY REPLICATE ===
        scaffoldGroup.scaffolds.forEach((scaffold, replicateIndex) => {
            const startRow = currentRow;

            // Other Descriptors
            let colStart = 0;
            if (scaffold.otherDescriptors.length > 0) {
                const { data, maxCol } = layoutDescriptors(scaffold.otherDescriptors, false);
                XLSX.utils.sheet_add_aoa(ws, [[`Other Descriptors (Replicate ${scaffold.replicateNumber})`]], { origin: { r: currentRow++, c: 0 } });
                XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: currentRow, c: 0 } });
                currentRow += data.length + 1;
                colStart = maxCol;
            }

            // Pore Descriptors
            if (scaffold.poreDescriptors.length > 0) {
                const { data } = layoutDescriptors(scaffold.poreDescriptors, true);
                XLSX.utils.sheet_add_aoa(ws, [[`Pore Descriptors (Replicate ${scaffold.replicateNumber})`]], { origin: { r: startRow, c: colStart } });
                XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: startRow + 1, c: colStart } });

                currentRow = Math.max(currentRow, startRow + 1 + data.length + 1);
            }

            currentRow += 1; // extra space
        });
    }

    const createFilePerDescriptor = (
        scaffoldGroups: ScaffoldGroup[],
        descriptors: DescriptorType[],
        fileName: string,
        options: {
            columnOption: string;
            sheetOption: string;
            excelFileOption: string;
        }
    ) => {
        descriptors.forEach(descriptor => {
            const wb = XLSX.utils.book_new();
    
            // Add General Info worksheet
            const generalInfoWs = createGeneralInfoWorksheet(scaffoldGroups);
            XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    
            // Check the structure based on options
            if (options.columnOption === 'Scaffold Replicates' && options.sheetOption === 'Scaffold Groups') {
                // Case: columns are scaffold replicates, sheets are scaffold groups
                scaffoldGroups.forEach((scaffoldGroup, groupIndex) => {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    const replicateHeaders = scaffoldGroup.scaffolds.map((_, replicateIndex) => `Replicate ${replicateIndex + 1}`);
    
                    // Add header row with replicate labels
                    XLSX.utils.sheet_add_aoa(ws, [replicateHeaders], { origin: { r: 0, c: 0 } });
    
                    let maxRows = 0; // Track the maximum number of rows needed
    
                    scaffoldGroup.scaffolds.forEach((scaffold, colIndex) => {
                        const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
    
                        if (descriptorData.length > 0) {
                            descriptorData.forEach(desc => {
                                let values: string[] = [];
                                if (typeof desc.values === 'string') {
                                    const first = desc.values.split(';')[0];
                                    const isIdVal = first.includes(',') && /^[^,]+,[^,]+$/.test(first.trim());

                                    if (isIdVal) {
                                        values = desc.values
                                            .split(';')
                                            .map((p: string) => p.trim())
                                            .map((p:string) => p.split(',')[1]?.trim() ?? '');
                                    } else {
                                        values = desc.values.split(',').map((v: string) => v.trim());
                                    }
                                } else if (Array.isArray(desc.values)) {
                                    values = desc.values.map((v: number) => String(v).trim());
                                }
                                values.forEach((value: string, valueIndex: number) => {
                                    // Write each value in the appropriate column and row
                                    addDataToWorksheet(ws, [[value]], valueIndex + 1, colIndex);
                                    maxRows = Math.max(maxRows, valueIndex + 1); // Update maxRows
                                });
                            });
                        }
                    });
    
                    // Label the sheet with the scaffold group ID
                    XLSX.utils.book_append_sheet(wb, ws, `Scaffold Group ${scaffoldGroup.id}`);
                });
            } else {
                // Original case: columns are scaffold groups, sheets are replicates
                const maxReplicates = Math.max(...scaffoldGroups.map(group => group.scaffolds.length));
                for (let replicateIndex = 0; replicateIndex < maxReplicates; replicateIndex++) {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    const scaffoldGroupIds = scaffoldGroups.map(group => `Scaffold Group ${group.id}`);
    
                    // Add header row with scaffold group IDs
                    XLSX.utils.sheet_add_aoa(ws, [scaffoldGroupIds], { origin: { r: 0, c: 0 } });
    
                    let currentRow = 1; // Initialize currentRow to start after the header row
                    scaffoldGroups.forEach((scaffoldGroup, colIndex) => {
                        if (scaffoldGroup.scaffolds[replicateIndex]) {
                            const scaffold = scaffoldGroup.scaffolds[replicateIndex];
                            const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
    
                            if (descriptorData.length > 0) {
                                descriptorData.forEach(desc => {
                                    let values: string[] = [];

                                    if (typeof desc.values === 'string') {
                                        // Check if it's a semicolon-delimited id,value list (pore descriptor)
                                        const first = desc.values.split(';')[0];
                                        const isIdValuePair = first.includes(',') && /^[^,]+,[^,]+$/.test(first.trim());

                                        if (isIdValuePair) {
                                            values = desc.values
                                                .split(';')
                                                .map((pair: string) => pair.trim())
                                                .map((pair: string) => pair.split(',')[1]?.trim() || '');
                                        } else {
                                            values = desc.values.split(',').map((v:string) => v.trim());
                                        }
                                    } else if (Array.isArray(desc.values)) {
                                        values = desc.values.map((v: number) => String(v).trim());
                                    }
                                    values.forEach((value: string, valueIndex: number) => {
                                        // Write each value in the appropriate column and row
                                        addDataToWorksheet(ws, [[value]], valueIndex + 1, colIndex);
                                        currentRow = Math.max(currentRow, valueIndex + 2); // Ensure rows align across groups
                                    });
                                });
                            }
                        }
                    });
    
                    // Label the sheet with the replicate number
                    XLSX.utils.book_append_sheet(wb, ws, `Replicate ${replicateIndex + 1}`);
                }
            }
    
            // Save the workbook
            XLSX.writeFile(wb, `${fileName}_${descriptor.name.slice(0, headingCharacterLength)}.xlsx`);
        });
    };

    const createFilePerReplicate = (
        scaffoldGroups: ScaffoldGroup[],
        descriptors: DescriptorType[],
        fileName: string,
        options: {
            columnOption: string;
            sheetOption: string;
            excelFileOption: string;
        }
    ) => {
        const maxReplicates = Math.max(...scaffoldGroups.map(group => group.scaffolds.length));
    
        // Create a file for each replicate
        for (let replicateIndex = 0; replicateIndex < maxReplicates; replicateIndex++) {
            const wb = XLSX.utils.book_new();
    
            // Add General Info worksheet
            const generalInfoWs = createGeneralInfoWorksheet(scaffoldGroups);
            XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    
            // Check if columns are scaffold groups or descriptors
            if (options.columnOption === 'Scaffold Groups' && options.sheetOption === 'Descriptors') {
                // Case: columns=scaffold groups, sheets=descriptors
                descriptors.forEach(descriptor => {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    
                    // Add header row with scaffold group IDs
                    const tableHeaders = [...scaffoldGroups.map(group => `Scaffold Group ${group.id}`)];
                    XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
    
                    let currentRow = 1; // Start adding data from row 1
    
                    // Add descriptor values for the current replicate
                    const rowData: any[][] = [];
                    scaffoldGroups.forEach((scaffoldGroup, colIndex) => {
                        const scaffold = scaffoldGroup.scaffolds[replicateIndex];
                        if (scaffold) {
                            const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
                            const valueRows: string[] = [];

                            if (descriptorData.length > 0 && typeof descriptorData[0].values === 'string') {
                                const raw = descriptorData[0].values;
                                const first = raw.split(';')[0];
                                const isIdValue = first.includes(',') && /^[^,]+,[^,]+$/.test(first.trim());

                                if (isIdValue) {
                                    // Pore descriptor: id,value
                                    raw.split(';').forEach((pair: string) => {
                                    const [, value] = pair.split(',').map(s => s.trim());
                                    if (value) valueRows.push(value);
                                    });
                                } else {
                                    // Global or other: comma-separated values
                                    valueRows.push(...raw.split(',').map((s: string) => s.trim()));
                                }
                            }

                            valueRows.forEach((value: string, rowIndex: number) => {
                                if (!rowData[rowIndex]) {
                                    rowData[rowIndex] = [];
                                }
                                rowData[rowIndex][colIndex] = value;
                            });
                        }
                    });
    
                    // Add each row to the worksheet
                    rowData.forEach((row, rowIndex) => {
                        XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: currentRow + rowIndex, c: 0 } });
                    });
    
                    // Add the worksheet to the workbook with the name of the descriptor
                    XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0, headingCharacterLength)}`);
                });
            } else if (options.columnOption === 'Descriptors' && options.sheetOption === 'Scaffold Groups') {
                scaffoldGroups.forEach(scaffoldGroup => {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    writeSingleReplicateSheetLikeDownload(ws, scaffoldGroup, replicateIndex);
                    XLSX.utils.book_append_sheet(wb, ws, `Scaffold Group ${scaffoldGroup.id}`);
                });
            }
    
            // Save the workbook with a filename indicating the replicate number
            XLSX.writeFile(wb, `${fileName}_Replicate${replicateIndex + 1}.xlsx`);
        }
    };

    const createFilePerScaffoldGroup = (
        scaffoldGroups: ScaffoldGroup[],
        descriptors: DescriptorType[],
        fileName: string
    ) => {
        scaffoldGroups.forEach(scaffoldGroup => {
            const wb = XLSX.utils.book_new();
    
            // Add General Info worksheet
            const generalInfoWs = createGeneralInfoWorksheet([scaffoldGroup]);
            XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    
            descriptors.forEach(descriptor => {
                const ws = XLSX.utils.aoa_to_sheet([]);
    
                // Add header row: 'Replicate 1', 'Replicate 2', etc.
                const tableHeaders = scaffoldGroup.scaffolds.map((_, replicateIndex) => `Replicate ${replicateIndex + 1}`);
                XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
    
                let currentRow = 1; // Start adding data from row 1
    
                const rowData: any[][] = [];
                scaffoldGroup.scaffolds.forEach((scaffold, colIndex) => {
                    const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
                    const valueRows: string[] = [];

                    if (descriptorData.length > 0 && typeof descriptorData[0].values === 'string') {
                        const raw = descriptorData[0].values;
                        const first = raw.split(';')[0];
                        const isIdValuePair = first.includes(',') && /^[^,]+,[^,]+$/.test(first.trim());

                        if (isIdValuePair) {
                            // Pore descriptor: parse id,value
                            raw.split(';').forEach((pair: string) => {
                                const [, value] = pair.split(',').map(s => s.trim());
                                if (value) valueRows.push(value);
                            });
                        } else {
                            // Global or other: just split on commas
                            valueRows.push(...raw.split(',').map((s: string) => s.trim()));
                        }
                    }
    
                    valueRows.forEach((value: string, valueIndex: number) => {
                        addDataToWorksheet(ws, [[value]], valueIndex + 1, colIndex);
                    });
                });
    
                // Add each row to the worksheet
                rowData.forEach((row, rowIndex) => {
                    XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: currentRow + rowIndex, c: 0 } });
                });
    
                // Add the worksheet to the workbook with the name of the descriptor
                XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0, headingCharacterLength)}`);
            });
    
            // Save the workbook with a filename indicating the scaffold group
            XLSX.writeFile(wb, `${fileName}_ScaffoldGroup${scaffoldGroup.id}.xlsx`);
        });
    };

    if (
        options.stackedColumnOption === 'True' &&
        options.excelFileOption === 'Scaffold Replicates' &&
        options.sheetOption === 'Descriptors' &&
        options.columnOption === 'Scaffold Groups'
    ) {
        // Case for columns=scaffold groups, sheets=descriptors, files=replicates, stacked=true
        createStackedWorkbook(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment_Stacked', options);
    } else if (
        options.stackedColumnOption === 'True' &&
        options.excelFileOption === 'Scaffold Replicates' &&
        options.sheetOption === 'Scaffold Groups' &&
        options.columnOption === 'Descriptors'
    ) {
        // Case for columns=descriptors, sheets=scaffold groups, files=replicates, stacked=true
        createStackedWorkbook(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment_Stacked', options);
    } else if (
        options.excelFileOption === 'Scaffold Groups' &&
        options.sheetOption === 'Descriptors' &&
        options.columnOption === 'Scaffold Replicates'
    ) {
        // Case for columns=replicates, sheets=descriptors, files=scaffold groups
        createFilePerScaffoldGroup(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment');
    } else if (
        options.stackedColumnOption === 'False' &&
        options.excelFileOption === 'Scaffold Replicates'
    ) {
        // General case for stackedColumnOption being false and excelFileOption set to 'Scaffold Replicates'
        createFilePerReplicate(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment', options);
    } else if (
        options.excelFileOption === 'Descriptors'
    ) {
        createFilePerDescriptor(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment', options);
    } else {
        // Fallback to creating a standard workbook
        createWorkbook(selectedScaffoldGroups, selectedDescriptorTypes, options.sheetOption, options.columnOption, 'Experiment');
    }
}

function layoutDescriptors(descriptors: Descriptor[], includePoreId: boolean): { data: any[][], maxCol: number } {
    descriptors = descriptors.sort((a, b) => a.label.localeCompare(b.label));

    const headers: string[] = [];
    const rows: any[][] = [];
    const poreIds: string[] = [];

    descriptors.forEach((desc, index) => {
        let valueRows: string[] = [];

        if (typeof desc.values === 'string') {
            // Detect if values are true `id,value` pairs
            const firstPair = desc.values.split(';')[0];
            const isIdValuePair = firstPair.includes(',') && /^[^,]+,[^,]+$/.test(firstPair.trim());

            if (includePoreId && isIdValuePair) {
                // Pore descriptor with id,value pairs
                const pairs = desc.values.split(';').map((pair: string) => pair.trim());

                pairs.forEach((pair, i) => {
                    const [id, val] = pair.split(',').map((s: string) => s.trim());
                    valueRows[i] = val;
                    if (!poreIds[i]) poreIds[i] = id;
                });

            } else {
                // Scalar values only
                valueRows = desc.values.split(',').map(val => val.trim());
            }
        }

        valueRows.forEach((val, i) => {
            if (!rows[i]) rows[i] = [];
            rows[i][index] = val;
        });

        headers.push(`${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
    });

    let maxCol = descriptors.length;

    if (includePoreId && poreIds.length > 0) {
        headers.push("PoreId");
        poreIds.forEach((id, i) => {
            if (!rows[i]) rows[i] = [];
            rows[i][headers.length - 1] = id;
        });
        maxCol++;
    }

    return { data: [headers, ...rows], maxCol };
}




// import * as XLSX from 'xlsx';
// import { ScaffoldGroup } from '../../models/scaffoldGroup';
// import { Descriptor } from '../../models/descriptor';
// import { DescriptorType } from '../../models/descriptorType';
// import { Scaffold } from '../../models/scaffold';

// const headingCharacterLength = 30;

// export function downloadScaffoldGroupAsExcel(scaffoldGroup: ScaffoldGroup) {
//     const wb = XLSX.utils.book_new();

//     // General Info and Input Group Info combined
//     const generalInfo = [
//         ["ID", scaffoldGroup.id],
//         ["Name", scaffoldGroup.name],
//         ["Simulated", scaffoldGroup.isSimulated.toString().toLowerCase()],
//         ["Number of Replicates", scaffoldGroup.numReplicates],
//         [], // Adding an empty row for spacing
//         ["Scaffold Inputs"],
//         ["Container Shape", scaffoldGroup.inputs.containerShape ?? 'n/a'],
//         ["Container Size", scaffoldGroup.inputs.containerSize ?? 'n/a'],
//         ["Packing Configuration", scaffoldGroup.inputs.packingConfiguration.toString().toLowerCase()],
//         [], // Another empty row for spacing
//         ["Particle Properties"]
//     ];

//     // Particle Properties Header and Data
//     const particlesHeader = ["Shape", "Stiffness", "Dispersity", "Size Distribution Type", "Mean Size", "Standard Deviation Size", "Proportion"];
//     const particlesData = scaffoldGroup.inputs.particles.map(p => [
//         p.shape, p.stiffness, p.dispersity, p.sizeDistributionType, p.meanSize, p.standardDeviationSize, p.proportion
//     ]);

//     // Append header and data to generalInfo
//     generalInfo.push(particlesHeader);
//     generalInfo.push(...particlesData); // Spread operator to add each particle info row

//     // Convert array of arrays into a worksheet
//     const ws = XLSX.utils.aoa_to_sheet(generalInfo);
//     XLSX.utils.book_append_sheet(wb, ws, 'General Info');

//     scaffoldGroup.scaffolds.forEach(scaffold => {
//         const ws = XLSX.utils.aoa_to_sheet([]);

//         // Global Descriptors at the very top
//         const globalHeaders = scaffold.globalDescriptors.map(desc => 
//             `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
//         const globalValues = scaffold.globalDescriptors.map(desc => desc.values);
//         XLSX.utils.sheet_add_aoa(ws, [["Global Descriptors"]], { origin: { r: 0, c: 0 } });
//         XLSX.utils.sheet_add_aoa(ws, [globalHeaders], { origin: { r: 1, c: 0 } }); // Place headers at row 1
//         XLSX.utils.sheet_add_aoa(ws, [globalValues], { origin: { r: 2, c: 0 } }); // Place values at row 2

//         const descriptorsStartRow = 4; // Global descriptors take up 2 rows, start next section from row 3

//         // Other Descriptors below Global Descriptors
//         let nextColStart = 0; // Track the next start column for Pore Descriptors
//         if (scaffold.otherDescriptors.length > 0) {
//             const { data, maxCol } = layoutDescriptors(scaffold.otherDescriptors);
//             XLSX.utils.sheet_add_aoa(ws, [["Other Descriptors"]], { origin: { r: descriptorsStartRow, c: 0 } });
//             XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: descriptorsStartRow+1, c: 0 } });
//             nextColStart = maxCol; // Update next column start for Pore Descriptors
//         }

//         // Pore Descriptors right after Other Descriptors
//         if (scaffold.poreDescriptors.length > 0) {
//             const { data } = layoutDescriptors(scaffold.poreDescriptors);
//             XLSX.utils.sheet_add_aoa(ws, [["Pore Descriptors"]], { origin: { r: descriptorsStartRow, c: nextColStart } });
//             XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: descriptorsStartRow+1, c: nextColStart } });
//         }

//         const sheetName = `Replicate ${scaffold.replicateNumber}`;
//         XLSX.utils.book_append_sheet(wb, ws, sheetName);

//     });

//     // XLSX.writeFile(wb, `${scaffoldGroup.name.replace(/\s+/g, '_').slice(0,headingCharacterLength)}.xlsx`);
//     const filename = `${scaffoldGroup.name.replace(/\s+/g, '_').slice(0,headingCharacterLength)}.xlsx`;
//     return {file: wb, filename: filename};
// }

// export function triggerDownload(wb: XLSX.WorkBook, filename: string) {
//     XLSX.writeFile(wb, filename);
// }

// export function downloadExperimentsAsExcel(
//     selectedScaffoldGroups: ScaffoldGroup[],
//     selectedDescriptorTypes: DescriptorType[],
//     options: {
//         excelFileOption: string;
//         sheetOption: string;
//         columnOption: string;
//         stackedColumnOption: string;
//     }
// ) {
//     const createGeneralInfoWorksheet = (scaffoldGroups: ScaffoldGroup[], key?: number | null) => {
//         const generalInfoData: any[][] = [];
//         scaffoldGroups.forEach((scaffoldGroup, index) => {
//             const scaffoldGroupInfo = [
//                 ["Key", `Scaffold Group ${key != null ? key + 1 : index + 1}`],
//                 ["ID", scaffoldGroup.id],
//                 ["Name", scaffoldGroup.name],
//                 ["Simulated", scaffoldGroup.isSimulated.toString().toLowerCase()],
//                 ["Number of Replicates", scaffoldGroup.numReplicates],
//                 [],
//                 ["Scaffold Inputs"],
//                 ["Container Shape", scaffoldGroup.inputs.containerShape ?? 'n/a'],
//                 ["Container Size", scaffoldGroup.inputs.containerSize ?? 'n/a'],
//                 ["Packing Configuration", scaffoldGroup.inputs.packingConfiguration.toString().toLowerCase()],
//                 [],
//                 ["Particle Properties"]
//             ];

//             const particlesHeader = ["Shape", "Stiffness", "Dispersity", "Size Distribution Type", "Mean Size", "Standard Deviation Size", "Proportion"];
//             const particlesData = scaffoldGroup.inputs.particles.map(p => [
//                 p.shape, p.stiffness, p.dispersity, p.sizeDistributionType, p.meanSize, p.standardDeviationSize, p.proportion
//             ]);

//             scaffoldGroupInfo.push(particlesHeader);
//             scaffoldGroupInfo.push(...particlesData);
//             scaffoldGroupInfo.push([], []); // Add empty rows for spacing between scaffold groups

//             generalInfoData.push(...scaffoldGroupInfo);
//         });

//         return XLSX.utils.aoa_to_sheet(generalInfoData);
//     };

//     const addDataToWorksheet = (ws: XLSX.WorkSheet, data: any[][], startRow: number, startCol: number) => {
//         XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: startRow, c: startCol } });
//     };

//     const getDescriptorData = (scaffold: Scaffold, descriptorTypeId: number, descriptorCategory: string) => {
//         let result: any[] = [];
//         switch (descriptorCategory.toLowerCase()) {
//             case 'global':
//                 result = scaffold.globalDescriptors.filter(d => d.descriptorTypeId === descriptorTypeId);
//                 break;
//             case 'pore':
//                 result = scaffold.poreDescriptors.filter(d => d.descriptorTypeId === descriptorTypeId);
//                 break;
//             case 'other':
//                 result = scaffold.otherDescriptors.filter(d => d.descriptorTypeId === descriptorTypeId);
//                 break;
//             default:
//                 result = [];
//         }
//         return result.map(desc => ({
//             ...desc,
//             values: typeof desc.values === 'string' ? desc.values.split(',') : desc.values
//         }));
//     };

//     const createDescriptorWorksheet = (
//         scaffoldGroup: ScaffoldGroup,
//         descriptors: DescriptorType[],
//         entityLabel: string,
//         replicateIndex?: number
//     ) => {
//         const ws = XLSX.utils.aoa_to_sheet([]);
//         let currentRow = 0;

//         scaffoldGroup.scaffolds.forEach((scaffold, scaffoldIndex) => {
//             descriptors.forEach(descriptor => {
//                 const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);

//                 if (descriptorData.length > 0) {
//                     const header = [entityLabel, `${descriptor.label}${descriptor.unit ? ' (' + descriptor.unit + ')' : ''}`];
//                     const values = [`Replicate ${replicateIndex !== undefined ? replicateIndex + 1 : scaffoldIndex + 1}`, descriptorData.map(d => d.values).join(', ')];

//                     addDataToWorksheet(ws, [header], currentRow, 0);
//                     addDataToWorksheet(ws, [values], currentRow + 1, 0);
//                     currentRow += 3; // Move to next section
//                 }
//             });
//         });

//         return ws;
//     };

//     const createDescriptorWorksheetWithColumns = (
//         scaffoldGroup: ScaffoldGroup,
//         descriptors: DescriptorType[],
//         entityLabel: string,
//         replicateIndex?: number
//     ) => {
//         const ws = XLSX.utils.aoa_to_sheet([]);
//         let currentRow = 0;

//         scaffoldGroup.scaffolds.forEach((scaffold, scaffoldIndex) => {
//             const globalDescriptors = scaffold.globalDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));
//             const poreDescriptors = scaffold.poreDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));
//             const otherDescriptors = scaffold.otherDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));

//             if (globalDescriptors.length > 0) {
//                 const globalHeaders = globalDescriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
//                 const globalValues = globalDescriptors.map(desc => desc.values);
//                 addDataToWorksheet(ws, [["Global Descriptors"]], currentRow, 0);
//                 addDataToWorksheet(ws, [globalHeaders], currentRow + 1, 0);
//                 addDataToWorksheet(ws, [globalValues], currentRow + 2, 0);
//                 currentRow += 4; // Move to next section
//             }

//             let colStart = 0

//             if (otherDescriptors.length > 0) {
//                 const { data, maxCol } = layoutDescriptors(otherDescriptors);
//                 addDataToWorksheet(ws, [["Other Descriptors"]], currentRow, 0);
//                 addDataToWorksheet(ws, data, currentRow + 1, 0);
//                 // currentRow += data.length + 1; // Move to next section
//                 colStart = maxCol
//             }

//             if (poreDescriptors.length > 0) {
//                 const { data } = layoutDescriptors(poreDescriptors);
//                 addDataToWorksheet(ws, [["Pore Descriptors"]], currentRow, colStart);
//                 addDataToWorksheet(ws, data, currentRow + 1, colStart);
//                 // currentRow += data.length + 1; // Move to next section
//             }
//         });

//         return ws;
//     };

//     const createWorkbook = (
//         scaffoldGroups: ScaffoldGroup[],
//         descriptors: DescriptorType[],
//         sheetOption: string,
//         columnOption: string,
//         fileName: string
//     ) => {
//         scaffoldGroups.forEach((scaffoldGroup, groupIndex) => {
//             const wb = XLSX.utils.book_new();

//             // Add General Info worksheet
//             const generalInfoWs = createGeneralInfoWorksheet([scaffoldGroup], groupIndex);
//             XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');

//             if (sheetOption === 'Descriptors') {
//                 descriptors.forEach(descriptor => {
//                     const ws = createDescriptorWorksheet(scaffoldGroup, [descriptor], 'Scaffold Group');
//                     XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0,headingCharacterLength)}`);
//                 });
//             } else if (sheetOption === 'Scaffold Replicates') {
//                 scaffoldGroup.scaffolds.forEach((_, replicateIndex) => {
//                     if (columnOption === 'Descriptors') {
//                         // const ws = createDescriptorWorksheetWithColumns(scaffoldGroup, descriptors, 'Replicate', replicateIndex);
//                         const ws = createDescriptorWorksheetWithColumns(
//                             { ...scaffoldGroup, scaffolds: [scaffoldGroup.scaffolds[replicateIndex]] },
//                             descriptors,
//                             'Replicate',
//                             replicateIndex
//                         );
//                         XLSX.utils.book_append_sheet(wb, ws, `Replicate ${replicateIndex + 1}`);
//                     } else {
//                         // const ws = createDescriptorWorksheet(scaffoldGroup, descriptors, 'Replicate', replicateIndex);
//                         const ws = createDescriptorWorksheet(
//                             { ...scaffoldGroup, scaffolds: [scaffoldGroup.scaffolds[replicateIndex]] },
//                             descriptors,
//                             'Replicate',
//                             replicateIndex
//                         );
//                         XLSX.utils.book_append_sheet(wb, ws, `Replicate ${replicateIndex + 1}`);
//                     }
//                 });
//             } else {
//                 if (columnOption === 'Descriptors') {
//                     const ws = createDescriptorWorksheetWithColumns(scaffoldGroup, descriptors, 'Scaffold Group');
//                     XLSX.utils.book_append_sheet(wb, ws, 'Data');
//                 } else {
//                     const ws = createDescriptorWorksheet(scaffoldGroup, descriptors, 'Data');
//                     XLSX.utils.book_append_sheet(wb, ws, 'Data');
//                 }
//             }

//             // Save the workbook
//             XLSX.writeFile(wb, `${fileName}_ScaffoldGroup${groupIndex + 1}.xlsx`);
//         });
//     };

    // const createStackedWorkbook = (
    //     scaffoldGroups: ScaffoldGroup[],
    //     descriptors: DescriptorType[],
    //     fileName: string,
    //     options: {
    //         columnOption: string;
    //         sheetOption: string;
    //         excelFileOption: string;
    //         stackedColumnOption: string; // Add this line
    //     }
    // ) => {
    //     const wb = XLSX.utils.book_new();
    
    //     // Add a single general info worksheet that covers all scaffold groups
    //     const generalInfoWs = createGeneralInfoWorksheet(scaffoldGroups);
    //     XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    
    //     if (
    //         options.columnOption === 'Scaffold Groups' &&
    //         options.sheetOption === 'Descriptors' &&
    //         options.excelFileOption === 'Scaffold Replicates' &&
    //         options.stackedColumnOption === 'True'
    //     ) {
    //         // Case for columns=scaffold groups, sheets=descriptors, files=replicates, stacked=true
    //         descriptors.forEach(descriptor => {
    //             const ws = XLSX.utils.aoa_to_sheet([]);
                
    //             // Add header row: 'Replicate' followed by 'Scaffold Group {id}' for each scaffold group
    //             const tableHeaders = ['Replicate', ...scaffoldGroups.map(group => `Scaffold Group ${group.id}`)];
    //             XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
    
    //             let currentRow = 1; // Start adding data from the first row below headers
    
    //             const maxReplicates = Math.max(...scaffoldGroups.map(group => group.scaffolds.length));
    //             for (let replicateIndex = 0; replicateIndex < maxReplicates; replicateIndex++) {
    //                 const rowData: any[][] = [];
    
    //                 scaffoldGroups.forEach((scaffoldGroup, colIndex) => {
    //                     const scaffold = scaffoldGroup.scaffolds[replicateIndex];
    //                     if (scaffold) {
    //                         const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
    //                         const values = descriptorData.length > 0
    //                             ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values])
    //                             : ['N/A'];
    
    //                         values.forEach((value: string, valueIndex: number) => {
    //                             // Ensure the row is initialized for adding data
    //                             if (!rowData[valueIndex]) {
    //                                 rowData[valueIndex] = [`${replicateIndex + 1}`]; // Initialize with replicate column
    //                             }
    //                             // Add the descriptor value to the appropriate column
    //                             rowData[valueIndex][colIndex + 1] = value; // +1 to offset the 'Replicate' column
    //                         });
    //                     }
    //                 });
    
    //                 // Add each row to the worksheet
    //                 const baseRow = currentRow;
    //                 rowData.forEach((row, rowIndex) => {
    //                     XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: baseRow + rowIndex, c: 0 } });
    //                 });
    //                 currentRow += rowData.length; // Move the currentRow pointer for the next set of data
    //             }
    
    //             // Add the worksheet to the workbook with the name of the descriptor
    //             XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0, headingCharacterLength)}`);
    //         });
    //     } else {
    //         // Original logic for other cases
    //         scaffoldGroups.forEach((scaffoldGroup) => {
    //             const ws = XLSX.utils.aoa_to_sheet([]);
                
    //             // Add a header row: 'Replicate', followed by each descriptor's label
    //             const tableHeaders = ['Replicate', ...descriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`)];
    //             XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
                
    //             let currentRow = 1; // Start adding data from the first row below headers
        
    //             scaffoldGroup.scaffolds.forEach((scaffold, replicateIndex) => {
    //                 const rowData: any[][] = [];
        
    //                 // Add 'Replicate' column data
    //                 const replicateColumn = `${replicateIndex + 1}`;
        
    //                 descriptors.forEach((descriptor, descriptorIndex) => {
    //                     const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
    //                     const values = descriptorData.length > 0 ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values]) : ['N/A'];
        
    //                     values.forEach((value: string, valueIndex: number) => {
    //                         // Ensure the row is initialized for adding data
    //                         if (!rowData[valueIndex]) {
    //                             rowData[valueIndex] = [replicateColumn]; // Initialize with replicate column
    //                         }
    //                         // Add the descriptor value to the appropriate column
    //                         rowData[valueIndex][descriptorIndex + 1] = value;
    //                     });
    //                 });
        
    //                 // Add each row to the worksheet
    //                 rowData.forEach((row, rowIndex) => {
    //                     XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: currentRow + rowIndex, c: 0 } });
    //                 });
        
    //                 currentRow += rowData.length; // Move the currentRow pointer for the next set of data
    //             });
        
    //             // Add the worksheet to the workbook with a name based on the scaffold group ID
    //             XLSX.utils.book_append_sheet(wb, ws, `Scaffold Group ${scaffoldGroup.id}`);
    //         });
    //     }
    
    //     // Save the workbook as a single file
    //     XLSX.writeFile(wb, `${fileName}_Replicates.xlsx`);
    // };

//     const createFilePerDescriptor = (
//         scaffoldGroups: ScaffoldGroup[],
//         descriptors: DescriptorType[],
//         fileName: string,
//         options: {
//             columnOption: string;
//             sheetOption: string;
//             excelFileOption: string;
//         }
//     ) => {
//         descriptors.forEach(descriptor => {
//             const wb = XLSX.utils.book_new();
    
//             // Add General Info worksheet
//             const generalInfoWs = createGeneralInfoWorksheet(scaffoldGroups);
//             XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    
//             // Check the structure based on options
//             if (options.columnOption === 'Scaffold Replicates' && options.sheetOption === 'Scaffold Groups') {
//                 // Case: columns are scaffold replicates, sheets are scaffold groups
//                 scaffoldGroups.forEach((scaffoldGroup, groupIndex) => {
//                     const ws = XLSX.utils.aoa_to_sheet([]);
//                     const replicateHeaders = scaffoldGroup.scaffolds.map((_, replicateIndex) => `Replicate ${replicateIndex + 1}`);
    
//                     // Add header row with replicate labels
//                     XLSX.utils.sheet_add_aoa(ws, [replicateHeaders], { origin: { r: 0, c: 0 } });
    
//                     let maxRows = 0; // Track the maximum number of rows needed
    
//                     scaffoldGroup.scaffolds.forEach((scaffold, colIndex) => {
//                         const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
    
//                         if (descriptorData.length > 0) {
//                             descriptorData.forEach(desc => {
//                                 const values = Array.isArray(desc.values) ? desc.values : [desc.values];
//                                 values.forEach((value: string, valueIndex: number) => {
//                                     // Write each value in the appropriate column and row
//                                     addDataToWorksheet(ws, [[value]], valueIndex + 1, colIndex);
//                                     maxRows = Math.max(maxRows, valueIndex + 1); // Update maxRows
//                                 });
//                             });
//                         }
//                     });
    
//                     // Label the sheet with the scaffold group ID
//                     XLSX.utils.book_append_sheet(wb, ws, `Scaffold Group ${scaffoldGroup.id}`);
//                 });
//             } else {
//                 // Original case: columns are scaffold groups, sheets are replicates
//                 const maxReplicates = Math.max(...scaffoldGroups.map(group => group.scaffolds.length));
//                 for (let replicateIndex = 0; replicateIndex < maxReplicates; replicateIndex++) {
//                     const ws = XLSX.utils.aoa_to_sheet([]);
//                     const scaffoldGroupIds = scaffoldGroups.map(group => `Scaffold Group ${group.id}`);
    
//                     // Add header row with scaffold group IDs
//                     XLSX.utils.sheet_add_aoa(ws, [scaffoldGroupIds], { origin: { r: 0, c: 0 } });
    
//                     let currentRow = 1; // Initialize currentRow to start after the header row
//                     scaffoldGroups.forEach((scaffoldGroup, colIndex) => {
//                         if (scaffoldGroup.scaffolds[replicateIndex]) {
//                             const scaffold = scaffoldGroup.scaffolds[replicateIndex];
//                             const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
    
//                             if (descriptorData.length > 0) {
//                                 descriptorData.forEach(desc => {
//                                     const values = Array.isArray(desc.values) ? desc.values : [desc.values];
//                                     values.forEach((value: string, valueIndex: number) => {
//                                         // Write each value in the appropriate column and row
//                                         addDataToWorksheet(ws, [[value]], valueIndex + 1, colIndex);
//                                         currentRow = Math.max(currentRow, valueIndex + 2); // Ensure rows align across groups
//                                     });
//                                 });
//                             }
//                         }
//                     });
    
//                     // Label the sheet with the replicate number
//                     XLSX.utils.book_append_sheet(wb, ws, `Replicate ${replicateIndex + 1}`);
//                 }
//             }
    
//             // Save the workbook
//             XLSX.writeFile(wb, `${fileName}_${descriptor.name.slice(0, headingCharacterLength)}.xlsx`);
//         });
//     };

//     const createFilePerReplicate = (
//         scaffoldGroups: ScaffoldGroup[],
//         descriptors: DescriptorType[],
//         fileName: string,
//         options: {
//             columnOption: string;
//             sheetOption: string;
//             excelFileOption: string;
//         }
//     ) => {
//         const maxReplicates = Math.max(...scaffoldGroups.map(group => group.scaffolds.length));
    
//         // Create a file for each replicate
//         for (let replicateIndex = 0; replicateIndex < maxReplicates; replicateIndex++) {
//             const wb = XLSX.utils.book_new();
    
//             // Add General Info worksheet
//             const generalInfoWs = createGeneralInfoWorksheet(scaffoldGroups);
//             XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    
//             // Check if columns are scaffold groups or descriptors
//             if (options.columnOption === 'Scaffold Groups' && options.sheetOption === 'Descriptors') {
//                 // Case: columns=scaffold groups, sheets=descriptors
//                 descriptors.forEach(descriptor => {
//                     const ws = XLSX.utils.aoa_to_sheet([]);
                    
//                     // Add header row with scaffold group IDs
//                     const tableHeaders = [...scaffoldGroups.map(group => `Scaffold Group ${group.id}`)];
//                     XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
    
//                     let currentRow = 1; // Start adding data from row 1
    
//                     // Add descriptor values for the current replicate
//                     const rowData: any[][] = [];
//                     scaffoldGroups.forEach((scaffoldGroup, colIndex) => {
//                         const scaffold = scaffoldGroup.scaffolds[replicateIndex];
//                         if (scaffold) {
//                             const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
//                             const values = descriptorData.length > 0
//                                 ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values])
//                                 : ['N/A'];
    
//                             values.forEach((value: string, valueIndex: number) => {
//                                 // Ensure the row is initialized for adding data
//                                 if (!rowData[valueIndex]) {
//                                     rowData[valueIndex] = []; // Start each row with the replicate number
//                                 }
//                                 // Add the descriptor value to the appropriate column
//                                 rowData[valueIndex][colIndex] = value;
//                             });
//                         }
//                     });
    
//                     // Add each row to the worksheet
//                     rowData.forEach((row, rowIndex) => {
//                         XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: currentRow + rowIndex, c: 0 } });
//                     });
    
//                     // Add the worksheet to the workbook with the name of the descriptor
//                     XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0, headingCharacterLength)}`);
//                 });
//             } else if (options.columnOption === 'Descriptors' && options.sheetOption === 'Scaffold Groups') {
//                 // Case: columns=descriptors, sheets=scaffold groups
//                 scaffoldGroups.forEach(scaffoldGroup => {
//                     const ws = XLSX.utils.aoa_to_sheet([]);
    
//                     // Add header row with descriptor types
//                     const tableHeaders = descriptors.map(
//                         desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`
//                     );
//                     XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
    
//                     let currentRow = 1; // Start adding data from row 1
    
//                     // Add descriptor values for the current replicate
//                     const scaffold = scaffoldGroup.scaffolds[replicateIndex];
//                     if (scaffold) {
//                         const rowData: any[][] = [];
    
//                         descriptors.forEach((descriptor, descriptorIndex) => {
//                             const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
//                             const values = descriptorData.length > 0
//                                 ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values])
//                                 : ['N/A'];
    
//                             values.forEach((value: string, valueIndex: number) => {
//                                 // Ensure the row is initialized for adding data
//                                 if (!rowData[valueIndex]) {
//                                     rowData[valueIndex] = [];
//                                 }
//                                 // Add the descriptor value to the appropriate column
//                                 rowData[valueIndex][descriptorIndex] = value;
//                             });
//                         });
    
//                         // Add each row to the worksheet
//                         rowData.forEach((row, rowIndex) => {
//                             XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: currentRow + rowIndex, c: 0 } });
//                         });
    
//                         currentRow += rowData.length; // Move the currentRow pointer for the next set of data
//                     }
    
//                     // Add the worksheet to the workbook with a name based on the scaffold group ID
//                     XLSX.utils.book_append_sheet(wb, ws, `Scaffold Group ${scaffoldGroup.id}`);
//                 });
//             }
    
//             // Save the workbook with a filename indicating the replicate number
//             XLSX.writeFile(wb, `${fileName}_Replicate${replicateIndex + 1}.xlsx`);
//         }
//     };

//     const createFilePerScaffoldGroup = (
//         scaffoldGroups: ScaffoldGroup[],
//         descriptors: DescriptorType[],
//         fileName: string
//     ) => {
//         scaffoldGroups.forEach(scaffoldGroup => {
//             const wb = XLSX.utils.book_new();
    
//             // Add General Info worksheet
//             const generalInfoWs = createGeneralInfoWorksheet([scaffoldGroup]);
//             XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    
//             descriptors.forEach(descriptor => {
//                 const ws = XLSX.utils.aoa_to_sheet([]);
    
//                 // Add header row: 'Replicate 1', 'Replicate 2', etc.
//                 const tableHeaders = scaffoldGroup.scaffolds.map((_, replicateIndex) => `Replicate ${replicateIndex + 1}`);
//                 XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
    
//                 let currentRow = 1; // Start adding data from row 1
    
//                 const rowData: any[][] = [];
//                 scaffoldGroup.scaffolds.forEach((scaffold, colIndex) => {
//                     const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
//                     const values = descriptorData.length > 0
//                         ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values])
//                         : ['N/A'];
    
//                     values.forEach((value: string, valueIndex: number) => {
//                         // Ensure the row is initialized for adding data
//                         if (!rowData[valueIndex]) {
//                             rowData[valueIndex] = [];
//                         }
//                         // Add the descriptor value to the appropriate column
//                         rowData[valueIndex][colIndex] = value;
//                     });
//                 });
    
//                 // Add each row to the worksheet
//                 rowData.forEach((row, rowIndex) => {
//                     XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: currentRow + rowIndex, c: 0 } });
//                 });
    
//                 // Add the worksheet to the workbook with the name of the descriptor
//                 XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0, headingCharacterLength)}`);
//             });
    
//             // Save the workbook with a filename indicating the scaffold group
//             XLSX.writeFile(wb, `${fileName}_ScaffoldGroup${scaffoldGroup.id}.xlsx`);
//         });
//     };

//     if (
//         options.stackedColumnOption === 'True' &&
//         options.excelFileOption === 'Scaffold Replicates' &&
//         options.sheetOption === 'Descriptors' &&
//         options.columnOption === 'Scaffold Groups'
//     ) {
//         // Case for columns=scaffold groups, sheets=descriptors, files=replicates, stacked=true
//         createStackedWorkbook(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment_Stacked', options);
//     } else if (
//         options.stackedColumnOption === 'True' &&
//         options.excelFileOption === 'Scaffold Replicates' &&
//         options.sheetOption === 'Scaffold Groups' &&
//         options.columnOption === 'Descriptors'
//     ) {
//         // Case for columns=descriptors, sheets=scaffold groups, files=replicates, stacked=true
//         createStackedWorkbook(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment_Stacked', options);
//     } else if (
//         options.columnOption === 'Scaffold Replicates' &&
//         options.sheetOption === 'Descriptors' &&
//         options.excelFileOption === 'Scaffold Groups'
//     ) {
//         // Case for columns=replicates, sheets=descriptors, files=scaffold groups
//         createFilePerScaffoldGroup(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment');
//     } else if (
//         options.stackedColumnOption === 'False' &&
//         options.excelFileOption === 'Scaffold Replicates'
//     ) {
//         // General case for stackedColumnOption being false and excelFileOption set to 'Scaffold Replicates'
//         createFilePerReplicate(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment', options);
//     } else if (
//         options.excelFileOption === 'Descriptors'
//     ) {
//         createFilePerDescriptor(selectedScaffoldGroups, selectedDescriptorTypes, 'Experiment', options);
//     } else {
//         // Fallback to creating a standard workbook
//         createWorkbook(selectedScaffoldGroups, selectedDescriptorTypes, options.sheetOption, options.columnOption, 'Experiment');
//     }
// }

// function layoutDescriptors(descriptors: Descriptor[]): { data: any[][], maxCol: number } {
//     // Sort alphabetically for consistency
//     descriptors = descriptors.sort((a, b) => a.label.localeCompare(b.label));
//     const headers = descriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
//     const rows: any[][] = [];
//     let maxCol = 0;
//     let uniqueIdColumn: string[] = []; // Stores unique ID column from first two-column descriptor
//     let uniqueIdDescriptorIndex: number | null = null;

//     descriptors.forEach((desc, index) => {
//         let rowsFromDescriptor: string[][] = desc.values.includes(';')
//             ? desc.values.split(';').map(row => row.split(',').map(col => col.trim()))
//             : desc.values.split(',').map(val => [val.trim()]);
    
//         // If this descriptor has 2+ columns and we haven't set the unique ID column yet
//         if (rowsFromDescriptor[0].length > 1 && uniqueIdDescriptorIndex === null) {
//             uniqueIdDescriptorIndex = index;
//             uniqueIdColumn = rowsFromDescriptor.map(cols => cols[0]); // Grab first column only
//         }
    
//         const descriptorValues = rowsFromDescriptor.map(cols =>
//             cols.length > 1 ? cols[1] : cols[0]
//         );
    
//         descriptorValues.forEach((value, i) => {
//             if (!rows[i]) rows[i] = [];
//             rows[i][index] = value;
//         });
    
//         maxCol = Math.max(maxCol, index + 1);
//     });

//     // If we detected a two-column descriptor, append "Unique Id" column at the end
//     if (uniqueIdColumn.length > 0) {
//         headers.push("Unique Id"); // Add header for Unique Id column
//         uniqueIdColumn.forEach((id, i) => {
//             if (!rows[i]) rows[i] = [];
//             rows[i].push(id); // Append unique ID value at the end of each row
//         });
//         maxCol++; // Increase max column count for new "Unique Id" column
//     }

//     return { data: [headers, ...rows], maxCol };
// }
