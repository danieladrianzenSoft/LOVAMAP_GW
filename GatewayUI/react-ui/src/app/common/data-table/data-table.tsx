import React from 'react';

export interface DataTableColumn<T> {
	/** Column header text */
	header: React.ReactNode;
	/** Render the cell for a given row and index */
	render: (row: T, index: number) => React.ReactNode;
	/** Optional extra classes applied to this column's <th> */
	headerClassName?: string;
	/** Optional extra classes applied to this column's <td> cells */
	cellClassName?: string;
}

export interface DataTableProps<T> {
	data: T[];
	columns: DataTableColumn<T>[];
	/** Optional row click handler. When provided, rows get hover + pointer styling. */
	onRowClick?: (row: T, index: number) => void;
	/** Unique key getter for rows. Defaults to the row index. */
	rowKey?: (row: T, index: number) => string | number;
	/** Optional message when data is empty */
	emptyMessage?: React.ReactNode;
	/** Optional extra classes for the outer wrapper */
	className?: string;
}

function DataTable<T>({
	data,
	columns,
	onRowClick,
	rowKey,
	emptyMessage = 'No data available.',
	className = '',
}: DataTableProps<T>) {
	const isClickable = !!onRowClick;

	return (
		<div className={`w-full overflow-x-auto rounded-lg ${className}`}>
			<table className="min-w-full divide-y divide-gray-200 text-sm">
				<thead className="bg-secondary-200">
					<tr>
						{columns.map((col, idx) => (
							<th
								key={idx}
								className={`px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.headerClassName ?? ''}`}
							>
								{col.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 bg-white">
					{data.length === 0 ? (
						<tr>
							<td
								colSpan={columns.length}
								className="px-4 py-6 text-center text-sm text-gray-500"
							>
								{emptyMessage}
							</td>
						</tr>
					) : (
						data.map((row, rowIndex) => (
							<tr
								key={rowKey ? rowKey(row, rowIndex) : rowIndex}
								onClick={isClickable ? () => onRowClick!(row, rowIndex) : undefined}
								className={isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}
							>
								{columns.map((col, colIndex) => (
									<td
										key={colIndex}
										className={`px-4 py-4 text-sm text-gray-700 ${col.cellClassName ?? ''}`}
									>
										{col.render(row, rowIndex)}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

export default DataTable;
