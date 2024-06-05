import * as XLSX from 'xlsx';
import { ScaffoldGroup } from '../../models/scaffoldGroup';
import { Descriptor } from '../../models/descriptor';

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
        ["Dx", scaffoldGroup.inputs.dx],
        ["Number of Voxels", scaffoldGroup.inputs.numVoxels],
        ["Container Shape", scaffoldGroup.inputs.containerShape ?? 'n/a'],
        ["Container Size", scaffoldGroup.inputs.containerSize ?? 'n/a'],
        ["Anisotropic", scaffoldGroup.inputs.isAnisotropic.toString().toLowerCase()],
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

        XLSX.utils.book_append_sheet(wb, ws, `Replicate ${scaffold.replicateNumber}`);
    });

    XLSX.writeFile(wb, `${scaffoldGroup.name.replace(/\s+/g, '_')}.xlsx`);
}

function layoutDescriptors(descriptors: Descriptor[]): { data: any[][], maxCol: number } {
    const headers = descriptors.map(desc => `${desc.label}${desc.unit ? ' (' + desc.unit + ')' : ''}`);
    const rows: any[][] = [];
    let maxCol = 0;

    descriptors.forEach((desc, index) => {
        const values = desc.values.split(',').map(value => value.trim());
        values.forEach((value, i) => {
            if (!rows[i]) rows[i] = []; // Ensure the row exists
            rows[i][index] = value; // Place the value in the correct column
        });
        maxCol = Math.max(maxCol, index + 1); // Update maxCol to ensure correct placement for Pore Descriptors
    });

    return { data: [headers, ...rows], maxCol };
}