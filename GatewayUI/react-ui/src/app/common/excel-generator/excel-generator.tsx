import * as XLSX from 'xlsx';
import { ScaffoldGroup } from '../../models/scaffoldGroup';
import { Descriptor } from '../../models/descriptor';
import { DescriptorType } from '../../models/descriptorType';
import { Scaffold } from '../../models/scaffold';

const headingCharacterLength = 30;

export function triggerDownload(wb: XLSX.WorkBook, filename: string) {
    XLSX.writeFile(wb, ensureXlsxFilename(filename));
}

export function triggerZipDownload(
    files: { file: XLSX.WorkBook; filename: string }[],
    zipFilename: string
) {
    const zipEntries = files.map(({ file, filename }) => {
        const bytes = new Uint8Array(XLSX.write(file, { bookType: 'xlsx', type: 'array' }));
        return {
            filename: ensureXlsxFilename(filename),
            bytes,
        };
    });

    const zipBytes = createZip(zipEntries);
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = ensureZipFilename(zipFilename);
    link.click();
    URL.revokeObjectURL(link.href);
}

function createZip(files: { filename: string; bytes: Uint8Array }[]) {
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    files.forEach(file => {
        const encodedName = new TextEncoder().encode(file.filename);
        const crc = crc32(file.bytes);
        const localHeader = new Uint8Array(30 + encodedName.length);
        const localView = new DataView(localHeader.buffer);

        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, 0, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, 0, true);
        localView.setUint16(12, 0, true);
        localView.setUint32(14, crc, true);
        localView.setUint32(18, file.bytes.length, true);
        localView.setUint32(22, file.bytes.length, true);
        localView.setUint16(26, encodedName.length, true);
        localView.setUint16(28, 0, true);
        localHeader.set(encodedName, 30);

        localParts.push(localHeader, file.bytes);

        const centralHeader = new Uint8Array(46 + encodedName.length);
        const centralView = new DataView(centralHeader.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, 0, true);
        centralView.setUint16(14, 0, true);
        centralView.setUint32(16, crc, true);
        centralView.setUint32(20, file.bytes.length, true);
        centralView.setUint32(24, file.bytes.length, true);
        centralView.setUint16(28, encodedName.length, true);
        centralView.setUint16(30, 0, true);
        centralView.setUint16(32, 0, true);
        centralView.setUint16(34, 0, true);
        centralView.setUint16(36, 0, true);
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, offset, true);
        centralHeader.set(encodedName, 46);
        centralParts.push(centralHeader);

        offset += localHeader.length + file.bytes.length;
    });

    const centralOffset = offset;
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralOffset, true);
    endView.setUint16(20, 0, true);

    return concatUint8Arrays([...localParts, ...centralParts, endRecord]);
}

const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let value = i;
        for (let j = 0; j < 8; j++) {
            value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
        }
        table[i] = value >>> 0;
    }
    return table;
})();

function crc32(bytes: Uint8Array) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
        crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(parts: Uint8Array[]) {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;
    parts.forEach(part => {
        output.set(part, offset);
        offset += part.length;
    });
    return output;
}

export function createGeneralInfoWorksheet(
  scaffoldGroups: ScaffoldGroup[],
  key?: number | null
): { worksheet: XLSX.WorkSheet; headingRows: number[] } {
  const generalInfoData: any[][] = [];
  const headingRows: number[] = [];
  let currentRow = 0;

  scaffoldGroups.forEach((scaffoldGroup, index) => {
    const startRow = currentRow;

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

    scaffoldGroupInfo.forEach(row => {
      generalInfoData.push(row);
      currentRow++;
    });

    headingRows.push(startRow);       // "Key"
    headingRows.push(startRow + 6);   // "Scaffold Inputs"
    headingRows.push(startRow + 11);  // "Particle Properties"

    const particlesHeader = [
      "Shape", "Stiffness", "Dispersity", "Size Distribution Type", "Mean Size",
      "Standard Deviation Size", "Proportion"
    ];

    generalInfoData.push(particlesHeader);
    headingRows.push(currentRow++);
    
    const particlesData = scaffoldGroup.inputs.particles.map(p => [
      p.shape, p.stiffness, p.dispersity, p.sizeDistributionType,
      p.meanSize, p.standardDeviationSize, p.proportion
    ]);

    particlesData.forEach(row => {
      generalInfoData.push(row);
      currentRow++;
    });

    generalInfoData.push([]);
    generalInfoData.push([]);
    currentRow += 2;
  });

  return {
    worksheet: XLSX.utils.aoa_to_sheet(generalInfoData),
    headingRows: Array.from(new Set(headingRows))
  };
}

export function downloadScaffoldGroupAsExcel(scaffoldGroup: ScaffoldGroup) {
    const wb = XLSX.utils.book_new();
    const headingRowsBySheet: Record<string, number[]> = {};

    // General Info
    const { worksheet: generalInfoWs, headingRows } = createGeneralInfoWorksheet([scaffoldGroup]);
    XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
    headingRowsBySheet['General Info'] = headingRows;

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
        headingRowsBySheet[sheetName] = [0, 4];

    });

    const filename = makeScaffoldGroupWorkbookFilename(scaffoldGroup);
    return {file: wb, filename: filename, headingRowsBySheet};
}

function makeScaffoldGroupWorkbookFilename(scaffoldGroup: ScaffoldGroup) {
    const baseName = sanitizeFilename(scaffoldGroup.name || `scaffold_group_${scaffoldGroup.id}`, headingCharacterLength);
    return `${baseName}_group_${scaffoldGroup.id}.xlsx`;
}

function ensureXlsxFilename(filename: string) {
    const safeName = sanitizeFilename(filename.replace(/\.xlsx$/i, ''), 120);
    return `${safeName}.xlsx`;
}

function ensureZipFilename(filename: string) {
    const safeName = sanitizeFilename(filename.replace(/\.zip$/i, ''), 120);
    return `${safeName}.zip`;
}

function sanitizeFilename(value: string, maxLength: number) {
    const sanitized = value
        .normalize('NFKD')
        .split('')
        .filter(character => character.charCodeAt(0) <= 127)
        .join('')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, maxLength);

    return sanitized || 'scaffold_group';
}

export function downloadExperimentsAsExcel(
    selectedScaffoldGroups: ScaffoldGroup[],
    selectedDescriptorTypes: DescriptorType[],
    options: {
        excelFileOption: string;
        sheetOption: string;
        columnOption: string;
        stackedColumnOption: string;
    },
    shouldReturnWorkbook: boolean = false
): { files: { file: XLSX.WorkBook; filename: string; headingRowsBySheet?: Record<string, number[]>; }[] } | void {

    const generatedFiles: { file: XLSX.WorkBook; filename: string; headingRowsBySheet?: Record<string, number[]>; }[] = [];

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
    ): { worksheet: XLSX.WorkSheet; headingRows: number[] } => {
        const ws = XLSX.utils.aoa_to_sheet([]);
        let currentRow = 0;
        const headingRows: number[] = [];

        scaffoldGroup.scaffolds.forEach((scaffold, scaffoldIndex) => {
            descriptors.forEach(descriptor => {
                const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);

                if (descriptorData.length > 0) {
                    const label = `${descriptor.label}${descriptor.unit ? ' (' + descriptor.unit + ')' : ''}`;
                    const header = [entityLabel, label, 'PoreId'];

                    // === Track header row
                    headingRows.push(currentRow);

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

        return { worksheet: ws, headingRows: Array.from(new Set(headingRows)) };
    };

    const createDescriptorWorksheetWithColumns = (
        scaffoldGroup: ScaffoldGroup,
        descriptors: DescriptorType[],
        entityLabel: string,
        columnOption: string,
        replicateIndex?: number
    ): { worksheet: XLSX.WorkSheet; headingRows: number[] } => {
        const ws = XLSX.utils.aoa_to_sheet([]);
        let currentRow = 0;
        const headingRows: number[] = [];

        scaffoldGroup.scaffolds.forEach((scaffold, scaffoldIndex) => {
            const globalDescriptors = scaffold.globalDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));
            const poreDescriptors = scaffold.poreDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));
            const otherDescriptors = scaffold.otherDescriptors.filter(d => descriptors.some(desc => desc.id === d.descriptorTypeId));

            // === Global Descriptors ===
            if (globalDescriptors.length > 0) {
                const globalHeaders = globalDescriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
                const globalValues = globalDescriptors.map(desc => desc.values);

                headingRows.push(currentRow);
                addDataToWorksheet(ws, [["Global Descriptors"]], currentRow, 0);
                addDataToWorksheet(ws, [globalHeaders], currentRow + 1, 0);
                addDataToWorksheet(ws, [globalValues], currentRow + 2, 0);
                currentRow += 4;
            }

            let colStart = 0;

            // === Other Descriptors ===
            if (otherDescriptors.length > 0) {
                const { data, maxCol } = layoutDescriptors(otherDescriptors, false);

                addDataToWorksheet(ws, [["Other Descriptors"]], currentRow, 0);
                addDataToWorksheet(ws, data, currentRow + 1, 0);
                headingRows.push(currentRow);
                // headingRows.push(currentRow + 1); // ✅ Row with descriptor headers
                colStart = maxCol;
            }

            // === Pore Descriptors ===
            if (poreDescriptors.length > 0) {
                const includePoreId = columnOption === 'Descriptors';
                const { data, maxCol } = layoutDescriptors(poreDescriptors, includePoreId);

                addDataToWorksheet(ws, [["Pore Descriptors"]], currentRow, colStart);
                addDataToWorksheet(ws, data, currentRow + 1, colStart);
                headingRows.push(currentRow);
                // headingRows.push(currentRow + 1); // ✅ Row with descriptor headers
                colStart += maxCol;
            }
        });

        return { worksheet: ws, headingRows: Array.from(new Set(headingRows)) };
    };

    const createWorkbook = (
        scaffoldGroups: ScaffoldGroup[],
        descriptors: DescriptorType[],
        sheetOption: string,
        columnOption: string,
        fileName: string
    ) => {
        const headingRowsBySheet: Record<string, number[]> = {};
        scaffoldGroups.forEach((scaffoldGroup, groupIndex) => {
            const wb = XLSX.utils.book_new();

            // Add General Info worksheet
            const { worksheet: generalInfoWs, headingRows: generalHeadings } = createGeneralInfoWorksheet([scaffoldGroup], groupIndex);
            const generalSheetName = 'General Info';
            XLSX.utils.book_append_sheet(wb, generalInfoWs, generalSheetName);
            headingRowsBySheet[generalSheetName] = generalHeadings;

            if (sheetOption === 'Descriptors') {
                descriptors.forEach(descriptor => {
                    const sheetName = descriptor.label.slice(0, headingCharacterLength);
                    const { worksheet: ws, headingRows } = createDescriptorWorksheet(scaffoldGroup, [descriptor], 'Scaffold Group');
                    headingRowsBySheet[sheetName] = headingRows;
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                });
            } else if (sheetOption === 'Scaffold Replicates') {
                scaffoldGroup.scaffolds.forEach((_, replicateIndex) => {
                    const sheetName = `Replicate ${replicateIndex + 1}`;
                    const singleGroup = { ...scaffoldGroup, scaffolds: [scaffoldGroup.scaffolds[replicateIndex]] };

                    let wsResult;
                    if (columnOption === 'Descriptors') {
                        wsResult = createDescriptorWorksheetWithColumns(singleGroup, descriptors, 'Replicate', columnOption, replicateIndex);
                    } else {
                        wsResult = createDescriptorWorksheet(singleGroup, descriptors, 'Replicate', replicateIndex);
                    }
                    headingRowsBySheet[sheetName] = wsResult.headingRows;
                    XLSX.utils.book_append_sheet(wb, wsResult.worksheet, sheetName);
                });
            } else {
                const sheetName = 'Data';
                let wsResult;
                if (columnOption === 'Descriptors') {
                    wsResult = createDescriptorWorksheetWithColumns(scaffoldGroup, descriptors, 'Scaffold Group', columnOption);
                } else {
                    wsResult = createDescriptorWorksheet(scaffoldGroup, descriptors, 'Data');
                }
                headingRowsBySheet[sheetName] = wsResult.headingRows;
                XLSX.utils.book_append_sheet(wb, wsResult.worksheet, sheetName);
            }

            // Save the workbook
            const filename = ensureXlsxFilename(`${fileName}_ScaffoldGroup${scaffoldGroup.id}`);
            if (shouldReturnWorkbook) {
                generatedFiles.push({ file: wb, filename, headingRowsBySheet });
            } else {
                triggerDownload(wb, filename);
            }
            // XLSX.writeFile(wb, `${fileName}_ScaffoldGroup${groupIndex + 1}.xlsx`);
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
        const headingRowsBySheet: Record<string, number[]> = {};
    
        // Add a single general info worksheet that covers all scaffold groups
        const generalSheetName = 'General Info';
        const { worksheet: generalInfoWs, headingRows: generalHeadings } = createGeneralInfoWorksheet(scaffoldGroups);
        XLSX.utils.book_append_sheet(wb, generalInfoWs, generalSheetName);
        headingRowsBySheet[generalSheetName] = generalHeadings;
    
        if (
            options.columnOption === 'Scaffold Groups' &&
            options.sheetOption === 'Descriptors' &&
            options.excelFileOption === 'Scaffold Replicates' &&
            options.stackedColumnOption === 'True'
        ) {
            descriptors.forEach(descriptor => {
                const ws = XLSX.utils.aoa_to_sheet([]);
                const headers = ['Replicate', ...scaffoldGroups.map(g => `Scaffold Group ID ${g.id}`)];
                XLSX.utils.sheet_add_aoa(ws, [headers], { origin: { r: 0, c: 0 } });

                const sheetName = descriptor.label.slice(0, 31);
                headingRowsBySheet[sheetName] = [0]; // Header is only row 0 (columns)

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

                // XLSX.utils.book_append_sheet(wb, ws, descriptor.label.slice(0, 31));
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // const filename = `${fileName}_Stacked.xlsx`;
            // if (shouldReturnWorkbook) {
            //     generatedFiles.push({ file: wb, filename });
            // } else {
            //     triggerDownload(wb, filename);
            // }
        } else if (
            options.columnOption === 'Descriptors' &&
            options.sheetOption === 'Scaffold Groups' &&
            options.excelFileOption === 'Scaffold Replicates' &&
            options.stackedColumnOption === 'True'
        ) {
            scaffoldGroups.forEach((scaffoldGroup) => {
                const name = `Scaffold Group ID ${scaffoldGroup.id}`.slice(0, 31);
                const { worksheet: ws, headingRows } = writeStackedGroupSheetLikeDownload(scaffoldGroup);
                XLSX.utils.book_append_sheet(wb, ws, name);
                headingRowsBySheet[name] = headingRows;
            });
        } else {
            // Original logic for other cases
            scaffoldGroups.forEach((scaffoldGroup) => {
                const ws = XLSX.utils.aoa_to_sheet([]);

                const sheetName = `Scaffold Group ID ${scaffoldGroup.id}`;
                const headingRows: number[] = [];

                // === Add a header row
                const tableHeaders = ['Replicate', ...descriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`)];
                const headerRowIndex = 0;
                XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: headerRowIndex, c: 0 } });
                headingRows.push(headerRowIndex);

                let currentRow = 1;

                scaffoldGroup.scaffolds.forEach((scaffold, replicateIndex) => {
                const rowData: any[][] = [];
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

                currentRow += rowData.length;
                });

                XLSX.utils.book_append_sheet(wb, ws, sheetName);
                headingRowsBySheet[sheetName] = headingRows;
            });
        }
    
        // Save the workbook as a single file
        const filename = ensureXlsxFilename(`${fileName}_Replicates`);
        if (shouldReturnWorkbook) {
            generatedFiles.push({ file: wb, filename, headingRowsBySheet });
        } else {
            triggerDownload(wb, filename);
        }
        return;
    };

    function writeStackedGroupSheetLikeDownload(scaffoldGroup: ScaffoldGroup): {
        worksheet: XLSX.WorkSheet;
        headingRows: number[];
    } {
        const ws = XLSX.utils.aoa_to_sheet([]);
        const headingRows: number[] = [];

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

            headingRows.push(currentRow); // Row with actual column headings
            XLSX.utils.sheet_add_aoa(ws, [['Global Descriptors']], { origin: { r: currentRow++, c: 0 } });
            XLSX.utils.sheet_add_aoa(ws, [headers], { origin: { r: currentRow, c: 0 } });
            currentRow++;
            XLSX.utils.sheet_add_aoa(ws, rows, { origin: { r: currentRow, c: 0 } });
            currentRow += rows.length + 1;
        }

        // === STACKED OTHER + PORE DESCRIPTORS ===
        scaffoldGroup.scaffolds.forEach(scaffold => {
            const startRow = currentRow;

            // Other Descriptors
            let colStart = 0;
            if (scaffold.otherDescriptors.length > 0) {
                const { data, maxCol } = layoutDescriptors(scaffold.otherDescriptors, false);
                if (data.length > 1) {
                    data[0].unshift('Replicate');
                    for (let r = 1; r < data.length; r++) {
                        data[r].unshift(scaffold.replicateNumber);
                    }

                    headingRows.push(currentRow);
                    XLSX.utils.sheet_add_aoa(ws, [['Other Descriptors']], { origin: { r: currentRow++, c: 0 } });
                    XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: currentRow, c: 0 } });
                    // headingRows.push(currentRow); // Row with actual headers
                    currentRow += data.length + 1;
                    colStart = maxCol + 1;
                }
            }

            // Pore Descriptors
            if (scaffold.poreDescriptors.length > 0) {
                const { data } = layoutDescriptors(scaffold.poreDescriptors, true);
                if (data.length > 1) {
                    data[0].unshift('Replicate');
                    for (let r = 1; r < data.length; r++) {
                        data[r].unshift(scaffold.replicateNumber);
                    }

                    headingRows.push(currentRow);
                    XLSX.utils.sheet_add_aoa(ws, [['Pore Descriptors']], { origin: { r: startRow, c: colStart } });
                    XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: startRow + 1, c: colStart } });
                    // headingRows.push(startRow + 1); // Row with actual headers
                    currentRow = Math.max(currentRow, startRow + 1 + data.length + 1);
                }
            }

            currentRow++;
        });

        return { worksheet: ws, headingRows: Array.from(new Set(headingRows)) };
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
            const headingRowsBySheet: Record<string, number[]> = {};
    
            // Add General Info worksheet
            const { worksheet: generalInfoWs, headingRows: generalHeadings } = createGeneralInfoWorksheet(scaffoldGroups);
            XLSX.utils.book_append_sheet(wb, generalInfoWs, 'General Info');
            headingRowsBySheet['General Info'] = generalHeadings;
    
            // Check the structure based on options
            if (options.columnOption === 'Scaffold Replicates' && options.sheetOption === 'Scaffold Groups') {
                // Case: columns are scaffold replicates, sheets are scaffold groups
                scaffoldGroups.forEach((scaffoldGroup, groupIndex) => {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    const replicateHeaders = scaffoldGroup.scaffolds.map((_, replicateIndex) => `Replicate ${replicateIndex + 1}`);
    
                    // Add header row with replicate labels
                    const sheetName = `Scaffold Group ID ${scaffoldGroup.id}`;
                    XLSX.utils.sheet_add_aoa(ws, [replicateHeaders], { origin: { r: 0, c: 0 } });
                    headingRowsBySheet[sheetName] = [0]; // Header row is always at row 0
    
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
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                });
            } else {
                // Original case: columns are scaffold groups, sheets are replicates
                const maxReplicates = Math.max(...scaffoldGroups.map(group => group.scaffolds.length));
                for (let replicateIndex = 0; replicateIndex < maxReplicates; replicateIndex++) {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    const scaffoldGroupIds = scaffoldGroups.map(group => `Scaffold Group ${group.id}`);
    
                    // Add header row with scaffold group IDs
                    const sheetName = `Replicate ${replicateIndex + 1}`;
                    XLSX.utils.sheet_add_aoa(ws, [scaffoldGroupIds], { origin: { r: 0, c: 0 } });
                    headingRowsBySheet[sheetName] = [0];
    
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
                    // XLSX.utils.book_append_sheet(wb, ws, `Replicate ${replicateIndex + 1}`);
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                }
            }
    
            // Save the workbook
            const filename = ensureXlsxFilename(`${fileName}_${descriptor.name.slice(0, headingCharacterLength)}`);
            if (shouldReturnWorkbook) {
                generatedFiles.push({ file: wb, filename, headingRowsBySheet });
            } else {
                triggerDownload(wb, filename);
            }
            return;
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
            const headingRowsBySheet: Record<string, number[]> = {};
    
            // === General Info
            const sheetName = 'General Info';
            const { worksheet: generalInfoWs, headingRows: generalHeadings } = createGeneralInfoWorksheet(scaffoldGroups);
            XLSX.utils.book_append_sheet(wb, generalInfoWs, sheetName);
            headingRowsBySheet[sheetName] = generalHeadings;
    
            // Check if columns are scaffold groups or descriptors
            if (options.columnOption === 'Scaffold Groups' && options.sheetOption === 'Descriptors') {
                // Case: columns=scaffold groups, sheets=descriptors
                descriptors.forEach(descriptor => {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    
                    // Add header row with scaffold group IDs
                    const tableHeaders = [...scaffoldGroups.map(group => `Scaffold Group ID ${group.id}`)];
                    XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
                    headingRowsBySheet[descriptor.label.slice(0, headingCharacterLength)] = [0];

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
                    const sheetName = `${descriptor.label.slice(0, headingCharacterLength)}`;
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    // XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0, headingCharacterLength)}`);
                });
            } else if (options.columnOption === 'Descriptors' && options.sheetOption === 'Scaffold Groups') {
                scaffoldGroups.forEach(scaffoldGroup => {
                    const ws = XLSX.utils.aoa_to_sheet([]);
                    const headingRows = writeSingleReplicateSheetLikeDownload(ws, scaffoldGroup, replicateIndex);
                    const sheetName = `Scaffold Group ID ${scaffoldGroup.id}`;
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    headingRowsBySheet[sheetName] = headingRows;
                });
            }
    
            // Save the workbook with a filename indicating the replicate number          
            const filename = ensureXlsxFilename(`${fileName}_Replicate${replicateIndex + 1}`);
            if (shouldReturnWorkbook) {
                // generatedFiles.push({ file: wb, filename });
                generatedFiles.push({ file: wb, filename, headingRowsBySheet });
            } else {
                triggerDownload(wb, filename);
            }
        }
    };

    const createFilePerScaffoldGroup = (
        scaffoldGroups: ScaffoldGroup[],
        descriptors: DescriptorType[],
        fileName: string
    ) => {
        scaffoldGroups.forEach(scaffoldGroup => {
            const wb = XLSX.utils.book_new();
            const headingRowsBySheet: Record<string, number[]> = {};
    
            // Add General Info worksheet
            const { worksheet: generalInfoWs, headingRows: generalHeadings } = createGeneralInfoWorksheet([scaffoldGroup]);
            const generalSheetName = 'General Info';
            XLSX.utils.book_append_sheet(wb, generalInfoWs, generalSheetName);
            headingRowsBySheet[generalSheetName] = generalHeadings;
    
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
                // XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0, headingCharacterLength)}`);
                const sheetName = descriptor.label.slice(0, headingCharacterLength);
                headingRowsBySheet[sheetName] = [0]; // Always row 0 for descriptor sheet headers
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
    
            // Save the workbook with a filename indicating the scaffold group
            const filename = ensureXlsxFilename(`${fileName}_ScaffoldGroup${scaffoldGroup.id}`);
            if (shouldReturnWorkbook) {
                generatedFiles.push({ file: wb, filename, headingRowsBySheet });
            } else {
                triggerDownload(wb, filename);
            }
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

    if (shouldReturnWorkbook) {
        return { files: generatedFiles };
    }
}

function writeSingleReplicateSheetLikeDownload(
  ws: XLSX.WorkSheet,
  scaffoldGroup: ScaffoldGroup,
  replicateIndex: number
): number[] {
    const scaffold = scaffoldGroup.scaffolds[replicateIndex];
    if (!scaffold) return [];

    const headingRows: number[] = [];
    let currentRow = 0;

    // === Global Descriptors ===
    const globalHeaders = scaffold.globalDescriptors.map(desc =>
        `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`
    );
    const globalValues = scaffold.globalDescriptors.map(desc => desc.values);

    headingRows.push(currentRow); // row with column headers
    XLSX.utils.sheet_add_aoa(ws, [["Global Descriptors"]], { origin: { r: currentRow++, c: 0 } });
    XLSX.utils.sheet_add_aoa(ws, [globalHeaders], { origin: { r: currentRow, c: 0 } });
    currentRow++;
    XLSX.utils.sheet_add_aoa(ws, [globalValues], { origin: { r: currentRow++, c: 0 } });

    let descriptorRowStart = currentRow;
    let otherHeight = 0;
    let poreHeight = 0;
    let colStart = 0;

    // === Other Descriptors ===
    if (scaffold.otherDescriptors.length > 0) {
        const { data, maxCol } = layoutDescriptors(scaffold.otherDescriptors, false);
        headingRows.push(descriptorRowStart); // data[0] is the header row
        XLSX.utils.sheet_add_aoa(ws, [["Other Descriptors"]], { origin: { r: descriptorRowStart, c: 0 } });
        XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: descriptorRowStart + 1, c: 0 } });
        otherHeight = data.length + 1; // +1 for title row
        colStart = maxCol;
    }

    // === Pore Descriptors ===
    if (scaffold.poreDescriptors.length > 0) {
        const { data } = layoutDescriptors(scaffold.poreDescriptors, true);
        headingRows.push(descriptorRowStart); // data[0] is the header row
        XLSX.utils.sheet_add_aoa(ws, [["Pore Descriptors"]], { origin: { r: descriptorRowStart, c: colStart } });
        XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: descriptorRowStart + 1, c: colStart } });
        poreHeight = data.length + 1;
    }

    // === Advance to the taller of the two blocks
    currentRow = descriptorRowStart + Math.max(otherHeight, poreHeight);

    return Array.from(new Set(headingRows));
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
