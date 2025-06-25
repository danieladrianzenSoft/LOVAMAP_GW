import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import AcknowledgementModal from '../../../features/acknowledgement/acknowledgement-modal';

interface ExcelPreviewProps<T> {
  generateExcel: (data: T) => { file: XLSX.WorkBook, filename: string }; // Function to generate Excel file and filename
  handleDownload: (workbook: XLSX.WorkBook, filename: string) => void; // Function to handle downloading the Excel file
  data: T; // Data to be passed to generateExcel
  size?: string; // Optional size for the preview box
  headingRows?: number[];
  numRows?: number;
}

const ExcelPreview = <T extends {}>({ generateExcel, data, handleDownload, headingRows, numRows }: ExcelPreviewProps<T>) => {
  const [excelData, setExcelData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [filename, setFilename] = useState<string>(''); // Track the filename for download
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const resolvedHeadingRows = useMemo(() => headingRows ?? [0], [headingRows]);
  const resolvedNumRows = numRows ?? 100;

  // Function to generate Excel and preview data
  const previewExcel = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      // Generate the workbook and preview data using the passed generateExcel function
      const { file, filename } = generateExcel(data);
      setWorkbook(file); // Store the workbook for download
      setFilename(filename); // Store the filename for download
      // const previewData = XLSX.utils.sheet_to_json(file.Sheets[file.SheetNames[1]], { header: 1 }); // Preview the first sheet
      // setExcelData(previewData.slice(0, 100)); // Show only the first 5 rows for preview
      const rawData: any[][] = XLSX.utils.sheet_to_json(file.Sheets[file.SheetNames[1]], { header: 1 });

      // Normalize rows to match header length
      const numCols = rawData.reduce((max, row) => Math.max(max, row.length), 0);

      const maxHeadingRow = Math.max(...resolvedHeadingRows);
      const sliceLimit = Math.max(resolvedNumRows, maxHeadingRow + 1);
      const normalizedData = rawData.slice(0, sliceLimit).map(row => {
        const padded = Array(numCols).fill('');
        row.forEach((cell: any, i: number) => {
          padded[i] = cell;
        });
        return padded;
      });

      setExcelData(normalizedData); // Show only the first 5 rows for preview


      setLoading(false);
    } catch (err) {
      setError('Error creating or reading Excel file');
      setLoading(false);
    }
  }, [data, generateExcel, resolvedHeadingRows, resolvedNumRows]);

  const handleDownloadClick = () => {
    setShowAcknowledgement(true);
  };

  const handleConfirmAcknowledgement = () => {
    setShowAcknowledgement(false);
    if (workbook && filename) {
      handleDownload(workbook, filename);
    }
  };

  const formatCellValue = (cell: any) => {
    // Only parse if it's a clean number (no GUIDs or mixed strings)
    if (typeof cell === 'string' && !/^\s*-?\d+(\.\d+)?\s*$/.test(cell)) {
      return cell;
    }
  
    const parsed = Number(cell);
    if (isNaN(parsed)) return cell;
  
    if (Number.isInteger(parsed)) return parsed;
  
    // Use exponential notation for very small or large numbers
    if (Math.abs(parsed) < 1e-4 || Math.abs(parsed) >= 1e+6) {
      return parsed.toExponential(3); // 4 sig figs = 1 digit before decimal + 3 after
    }
  
    // Otherwise use regular precision (4 sig figs) and trim trailing .0
    const formatted = Number(parsed.toPrecision(4));
    return formatted;
  };

  // Generate the preview when the component mounts or when data changes
  useEffect(() => {
    previewExcel();
  }, [data, previewExcel]);

  const tableSections = useMemo(() => {
    const sections: { headerRow: any[]; bodyRows: any[][] }[] = [];
  
    for (let i = 0; i < resolvedHeadingRows.length; i++) {
      const start = resolvedHeadingRows[i];
      const end = resolvedHeadingRows[i + 1] ?? excelData.length;
  
      const headerRow = excelData[start] ?? [];
      const bodyRows = excelData.slice(start + 1, end);
      sections.push({ headerRow, bodyRows });
    }
  
    return sections;
  }, [excelData, resolvedHeadingRows]);
  
  return (
    <div className="relative w-full h-full">
      {/* Fixed Header Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow z-10 flex justify-between items-center px-4 py-2 border-b">
        <div className="text-sm font-medium text-gray-700">
          {filename}
          <span className="text-gray-500 italic"> - Replicate 1 (showing first {resolvedNumRows} rows)</span>
        </div>
        <button
          // onClick={() => workbook && filename && handleDownload(workbook, filename)}
          onClick={handleDownloadClick}
          className="px-4 py-2 rounded transition bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          Download
        </button>
      </div>
  
      {loading && (
        <div className="flex flex-col items-center justify-center h-[80vh] text-gray-600 text-sm">
          <svg className="animate-spin h-5 w-5 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading preview...
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"><title>Close</title><path d="M14.348 5.652a1 1 0 00-1.414-1.414L10 7.172 7.066 4.238a1 1 0 10-1.414 1.414L8.586 8.586l-2.934 2.934a1 1 0 101.414 1.414L10 10.828l2.934 2.934a1 1 0 001.414-1.414L11.414 8.586l2.934-2.934z" /></svg>
          </button>
        </div>
      )}

      {!loading && !error && excelData.length > 0 && (
        <div className="bg-white shadow-md p-2 overflow-auto space-y-8 mt-14">
          {tableSections.map((section, sectionIndex) => (
            <table key={sectionIndex} className="text-xs table-auto w-full border">
              <thead>
                <tr>
                  {section.headerRow.map((header: string, idx: number) => (
                    <th key={idx} className="px-2 py-1 border-b bg-gray-100 font-semibold text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.bodyRows.map((row: any[], rowIndex: number) => (
                  <tr key={rowIndex}>
                    {row.map((cell: any, cellIndex: number) => (
                      <td key={cellIndex} className="px-2 py-1 border-b">
                        {formatCellValue(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      )}

      <AcknowledgementModal
        isOpen={showAcknowledgement}
        onClose={() => setShowAcknowledgement(false)}
        onConfirm={handleConfirmAcknowledgement}
      />
    </div>
  );
};

export default ExcelPreview;