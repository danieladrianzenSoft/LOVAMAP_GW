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
            const { data, maxCol } = layoutDescriptors(scaffold.otherDescriptors);
            XLSX.utils.sheet_add_aoa(ws, [["Other Descriptors"]], { origin: { r: descriptorsStartRow, c: 0 } });
            XLSX.utils.sheet_add_aoa(ws, data, { origin: { r: descriptorsStartRow+1, c: 0 } });
            nextColStart = maxCol; // Update next column start for Pore Descriptors
        }

        // Pore Descriptors right after Other Descriptors
        if (scaffold.poreDescriptors.length > 0) {
            const { data } = layoutDescriptors(scaffold.poreDescriptors);
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
        return result.map(desc => ({
            ...desc,
            values: typeof desc.values === 'string' ? desc.values.split(',') : desc.values
        }));
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
                    const header = [entityLabel, `${descriptor.label}${descriptor.unit ? ' (' + descriptor.unit + ')' : ''}`];
                    const values = [`Replicate ${replicateIndex !== undefined ? replicateIndex + 1 : scaffoldIndex + 1}`, descriptorData.map(d => d.values).join(', ')];

                    addDataToWorksheet(ws, [header], currentRow, 0);
                    addDataToWorksheet(ws, [values], currentRow + 1, 0);
                    currentRow += 3; // Move to next section
                }
            });
        });

        return ws;
    };

    const createDescriptorWorksheetWithColumns = (
        scaffoldGroup: ScaffoldGroup,
        descriptors: DescriptorType[],
        entityLabel: string,
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
                const { data, maxCol } = layoutDescriptors(otherDescriptors);
                addDataToWorksheet(ws, [["Other Descriptors"]], currentRow, 0);
                addDataToWorksheet(ws, data, currentRow + 1, 0);
                // currentRow += data.length + 1; // Move to next section
                colStart = maxCol
            }

            if (poreDescriptors.length > 0) {
                const { data } = layoutDescriptors(poreDescriptors);
                addDataToWorksheet(ws, [["Pore Descriptors"]], currentRow, colStart);
                addDataToWorksheet(ws, data, currentRow + 1, colStart);
                // currentRow += data.length + 1; // Move to next section
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
                    const ws = createDescriptorWorksheetWithColumns(scaffoldGroup, descriptors, 'Scaffold Group');
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
            stackedColumnOption: string; // Add this line
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
            // Case for columns=scaffold groups, sheets=descriptors, files=replicates, stacked=true
            descriptors.forEach(descriptor => {
                const ws = XLSX.utils.aoa_to_sheet([]);
                
                // Add header row: 'Replicate' followed by 'Scaffold Group {id}' for each scaffold group
                const tableHeaders = ['Replicate', ...scaffoldGroups.map(group => `Scaffold Group ${group.id}`)];
                XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
    
                let currentRow = 1; // Start adding data from the first row below headers
    
                const maxReplicates = Math.max(...scaffoldGroups.map(group => group.scaffolds.length));
                for (let replicateIndex = 0; replicateIndex < maxReplicates; replicateIndex++) {
                    const rowData: any[][] = [];
    
                    scaffoldGroups.forEach((scaffoldGroup, colIndex) => {
                        const scaffold = scaffoldGroup.scaffolds[replicateIndex];
                        if (scaffold) {
                            const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
                            const values = descriptorData.length > 0
                                ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values])
                                : ['N/A'];
    
                            values.forEach((value: string, valueIndex: number) => {
                                // Ensure the row is initialized for adding data
                                if (!rowData[valueIndex]) {
                                    rowData[valueIndex] = [`${replicateIndex + 1}`]; // Initialize with replicate column
                                }
                                // Add the descriptor value to the appropriate column
                                rowData[valueIndex][colIndex + 1] = value; // +1 to offset the 'Replicate' column
                            });
                        }
                    });
    
                    // Add each row to the worksheet
                    const baseRow = currentRow;
                    rowData.forEach((row, rowIndex) => {
                        XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: baseRow + rowIndex, c: 0 } });
                    });
                    currentRow += rowData.length; // Move the currentRow pointer for the next set of data
                }
    
                // Add the worksheet to the workbook with the name of the descriptor
                XLSX.utils.book_append_sheet(wb, ws, `${descriptor.label.slice(0, headingCharacterLength)}`);
            });
        } else {
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
                        const values = descriptorData.length > 0 ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values]) : ['N/A'];
        
                        values.forEach((value: string, valueIndex: number) => {
                            // Ensure the row is initialized for adding data
                            if (!rowData[valueIndex]) {
                                rowData[valueIndex] = [replicateColumn]; // Initialize with replicate column
                            }
                            // Add the descriptor value to the appropriate column
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
                                const values = Array.isArray(desc.values) ? desc.values : [desc.values];
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
                                    const values = Array.isArray(desc.values) ? desc.values : [desc.values];
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
                            const values = descriptorData.length > 0
                                ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values])
                                : ['N/A'];
    
                            values.forEach((value: string, valueIndex: number) => {
                                // Ensure the row is initialized for adding data
                                if (!rowData[valueIndex]) {
                                    rowData[valueIndex] = []; // Start each row with the replicate number
                                }
                                // Add the descriptor value to the appropriate column
                                rowData[valueIndex][colIndex] = value;
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
                // Case: columns=descriptors, sheets=scaffold groups
                scaffoldGroups.forEach(scaffoldGroup => {
                    const ws = XLSX.utils.aoa_to_sheet([]);
    
                    // Add header row with descriptor types
                    const tableHeaders = descriptors.map(
                        desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`
                    );
                    XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: { r: 0, c: 0 } });
    
                    let currentRow = 1; // Start adding data from row 1
    
                    // Add descriptor values for the current replicate
                    const scaffold = scaffoldGroup.scaffolds[replicateIndex];
                    if (scaffold) {
                        const rowData: any[][] = [];
    
                        descriptors.forEach((descriptor, descriptorIndex) => {
                            const descriptorData = getDescriptorData(scaffold, descriptor.id, descriptor.category);
                            const values = descriptorData.length > 0
                                ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values])
                                : ['N/A'];
    
                            values.forEach((value: string, valueIndex: number) => {
                                // Ensure the row is initialized for adding data
                                if (!rowData[valueIndex]) {
                                    rowData[valueIndex] = [];
                                }
                                // Add the descriptor value to the appropriate column
                                rowData[valueIndex][descriptorIndex] = value;
                            });
                        });
    
                        // Add each row to the worksheet
                        rowData.forEach((row, rowIndex) => {
                            XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: currentRow + rowIndex, c: 0 } });
                        });
    
                        currentRow += rowData.length; // Move the currentRow pointer for the next set of data
                    }
    
                    // Add the worksheet to the workbook with a name based on the scaffold group ID
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
                    const values = descriptorData.length > 0
                        ? (Array.isArray(descriptorData[0].values) ? descriptorData[0].values : [descriptorData[0].values])
                        : ['N/A'];
    
                    values.forEach((value: string, valueIndex: number) => {
                        // Ensure the row is initialized for adding data
                        if (!rowData[valueIndex]) {
                            rowData[valueIndex] = [];
                        }
                        // Add the descriptor value to the appropriate column
                        rowData[valueIndex][colIndex] = value;
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
        options.columnOption === 'Scaffold Replicates' &&
        options.sheetOption === 'Descriptors' &&
        options.excelFileOption === 'Scaffold Groups'
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

function layoutDescriptors(descriptors: Descriptor[]): { data: any[][], maxCol: number } {
    // Sort alphabetically for consistency
    descriptors = descriptors.sort((a, b) => a.label.localeCompare(b.label));
    const headers = descriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
    const rows: any[][] = [];
    let maxCol = 0;
    let uniqueIdColumn: string[] = []; // Stores unique ID column from first two-column descriptor
    let uniqueIdDescriptorIndex: number | null = null;

    descriptors.forEach((desc, index) => {
        let rowsFromDescriptor: string[][] = desc.values.includes(';')
            ? desc.values.split(';').map(row => row.split(',').map(col => col.trim()))
            : desc.values.split(',').map(val => [val.trim()]);
    
        // If this descriptor has 2+ columns and we haven't set the unique ID column yet
        if (rowsFromDescriptor[0].length > 1 && uniqueIdDescriptorIndex === null) {
            uniqueIdDescriptorIndex = index;
            uniqueIdColumn = rowsFromDescriptor.map(cols => cols[0]); // Grab first column only
        }
    
        const descriptorValues = rowsFromDescriptor.map(cols =>
            cols.length > 1 ? cols[1] : cols[0]
        );
    
        descriptorValues.forEach((value, i) => {
            if (!rows[i]) rows[i] = [];
            rows[i][index] = value;
        });
    
        maxCol = Math.max(maxCol, index + 1);
    });

    // If we detected a two-column descriptor, append "Unique Id" column at the end
    if (uniqueIdColumn.length > 0) {
        headers.push("Unique Id"); // Add header for Unique Id column
        uniqueIdColumn.forEach((id, i) => {
            if (!rows[i]) rows[i] = [];
            rows[i].push(id); // Append unique ID value at the end of each row
        });
        maxCol++; // Increase max column count for new "Unique Id" column
    }

    return { data: [headers, ...rows], maxCol };
}
