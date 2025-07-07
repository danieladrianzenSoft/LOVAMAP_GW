import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import AcknowledgementModal from '../../../features/acknowledgement/acknowledgement-modal';

// interface ExcelPreviewProps<T> {
//   generateExcel: (data: T) => { file: XLSX.WorkBook, filename: string };
//   handleDownload: (workbook: XLSX.WorkBook, filename: string) => void;
//   data: T;
//   size?: string;
//   headingRows?: number[];
//   numRows?: number;
// }
// interface ExcelPreviewProps {
//   data: {
//     file: XLSX.WorkBook;
//     filename: string;
//     headingRowsBySheet?: Record<string, number[]>;
//   },
//   generateExcel: () => { file: XLSX.WorkBook; filename: string };
//   handleDownload: (workbook: XLSX.WorkBook, filename: string) => void;
//   size?: string;
//   headingRows?: number[];
//   numRows?: number;
// }

interface ExcelPreviewProps {
  data: {
    file: XLSX.WorkBook;
    filename: string;
    headingRowsBySheet?: Record<string, number[]>;
  };
  handleDownload: (workbook: XLSX.WorkBook, filename: string) => void;
  allFiles?: {
    file: XLSX.WorkBook;
    filename: string;
    headingRowsBySheet?: Record<string, number[]>;
  }[];
  fileIndex?: number;
  onFileChange?: (index: number) => void;
  size?: string;
  headingRows?: number[];
  numRows?: number;
}


const ExcelPreview = ({
  data,
  handleDownload,
  allFiles,
  fileIndex,
  onFileChange,
  headingRows,
  numRows = 100
}: ExcelPreviewProps) => {
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  const resolvedHeadingRows = useMemo(() => {
    if (!workbook) return [0]; // fallback if workbook hasn't been set yet

    const sheetName = workbook.SheetNames[selectedSheetIndex] ?? '';
    const headings = (
      headingRows ??
      data.headingRowsBySheet?.[sheetName] ??
      [0]
    );

    return headings;
  }, [workbook, selectedSheetIndex, headingRows, data.headingRowsBySheet]);


  // Identify default sheet index (e.g., first non-"General Info")
  const getDefaultSheetIndex = (wb: XLSX.WorkBook): number => {
    const idx = wb.SheetNames.findIndex(name => !/general info/i.test(name));
    return idx !== -1 ? idx : 0;
  };

  const previewExcel = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const { file, filename } = data;
      setWorkbook(file);
      setFilename(filename);

      const sheet = file.Sheets[file.SheetNames[selectedSheetIndex]];
      const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // const headerSet = new Set(resolvedHeadingRows);
      const guaranteedRows = new Set<number>();

      resolvedHeadingRows.forEach(row => {
        guaranteedRows.add(row);
        if (row + 1 < rawData.length) guaranteedRows.add(row + 1);
      });

      const rowIndicesToShow: number[] = [];

      for (let i = 0; i < rawData.length && rowIndicesToShow.length < numRows; i++) {
        if (guaranteedRows.has(i) || rowIndicesToShow.length < numRows) {
          rowIndicesToShow.push(i);
        }
      }

      const numCols = rawData.reduce((max, row) => Math.max(max, row.length), 0);
      const normalizedData = rowIndicesToShow.map(rowIndex => {
        const row = rawData[rowIndex] ?? [];
        const padded = Array(numCols).fill('');
        row.forEach((cell: any, i: number) => {
          padded[i] = cell;
        });
        return padded;
      });

      setExcelData(normalizedData);
      setLoading(false);
    } catch (err) {
      console.error('Preview error:', err);
      setError('Error creating or reading Excel file');
      setLoading(false);
    }
  }, [data, numRows, resolvedHeadingRows, selectedSheetIndex]);

  const handleDownloadClick = () => setShowAcknowledgement(true);
  const handleConfirmAcknowledgement = () => {
    setShowAcknowledgement(false);

    if (allFiles && allFiles.length > 1) {
      allFiles.forEach(({ file, filename }) => {
        handleDownload(file, filename);
      });
    } else if (workbook && filename) {
      handleDownload(workbook, filename);
    }
  };

  const formatCellValue = (cell: any) => {
    if (typeof cell === 'string' && !/^\s*-?\d+(\.\d+)?\s*$/.test(cell)) {
      return cell;
    }
    const parsed = Number(cell);
    if (isNaN(parsed)) return cell;
    if (Number.isInteger(parsed)) return parsed;
    if (Math.abs(parsed) < 1e-4 || Math.abs(parsed) >= 1e+6) {
      return parsed.toExponential(3);
    }
    return Number(parsed.toPrecision(4));
  };

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

  // On mount or when data changes
  useEffect(() => {
    // const { file } = generateExcel(data);
    const { file, } = data;
    const defaultIndex = getDefaultSheetIndex(file);
    setSelectedSheetIndex(defaultIndex);
    setWorkbook(file);
    setFilename(file.Props?.Title || 'Preview.xlsx');
  }, [data]);

  // When selected sheet changes or workbook is ready
  useEffect(() => {
    if (workbook) {
      previewExcel();
    }
  }, [selectedSheetIndex, workbook, previewExcel]);

  return (
    <div className="relative w-full h-full">
      {/* Fixed Header Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow z-10 flex justify-between items-center px-4 py-2 border-b">
        <div className="text-sm font-medium text-gray-700 flex items-center gap-3">
          <span>{filename}</span>
          {workbook && workbook.SheetNames.length > 1 && (
            <select
              value={selectedSheetIndex}
              onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
            >
              {workbook.SheetNames.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>
          )}
          {allFiles && allFiles?.length > 1 && (
            <select
              value={fileIndex}
              onChange={(e) => onFileChange?.(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
            >
              {allFiles.map((f, idx) => (
                <option key={idx} value={idx}>
                  {f.filename}
                </option>
              ))}
            </select>
          )}

          <span className="text-gray-500 italic">
            – Showing first {numRows} rows
          </span>
        </div>
        <button
          onClick={handleDownloadClick}
          className="px-4 py-2 rounded transition bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          Download
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-[80vh] text-gray-600 text-sm mt-20">
          <svg className="animate-spin h-5 w-5 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading preview...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-20" role="alert">
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

      {/* Table Preview */}
      {!loading && !error && excelData.length > 0 && (
        <div className="bg-white shadow-md p-2 overflow-auto space-y-8 mt-20">
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