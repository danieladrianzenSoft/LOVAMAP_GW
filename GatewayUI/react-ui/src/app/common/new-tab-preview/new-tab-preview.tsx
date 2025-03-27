import ReactDOM from "react-dom/client";
import React from "react";
import ExcelPreview from '../excel-preview/excel-preview';
import * as XLSX from 'xlsx';

export const openPreviewInNewTab = <T extends {}>(
  data: T,
  generateExcel: (data: T) => { file: XLSX.WorkBook, filename: string },
  handleDownload: (workbook: XLSX.WorkBook, filename: string) => void,
  headingRows?: number[],
  numRows?: number
) => {
//   const newWindow = window.open("", "_blank", "width=1000,height=800");
	const newWindow = window.open("", "_blank");

	if (!newWindow) {
		alert("Failed to open new tab.");
		return;
	}

//   newWindow.document.write(`
//     <html>
//       <head>
//         <title>Excel Preview</title>
//         <style>
//           body { margin: 0; padding: 10px; font-family: sans-serif; }
//         </style>
//       </head>
//       <body>
//         <div id="excel-root"></div>
//       </body>
//     </html>
//   `);

//   newWindow.document.close();

	const html = `
	<html>
		<head>
		<title>Excel Preview</title>
		<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
		<style>
			body { margin: 0; padding: 10px; font-family: sans-serif; }
		</style>
		</head>
		<body>
		<div id="excel-root"></div>
		</body>
	</html>
	`;

	newWindow.document.open();
	newWindow.document.write(html);
	newWindow.document.close();

	const mountPoint = newWindow.document.getElementById("excel-root");
	if (mountPoint) {
		const root = ReactDOM.createRoot(mountPoint);
		root.render(
		<ExcelPreview
			generateExcel={generateExcel}
			handleDownload={handleDownload}
			data={data}
			headingRows={headingRows}
			numRows={numRows}
		/>
		);
	}
};