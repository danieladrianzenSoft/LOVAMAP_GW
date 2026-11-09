import React from "react";
import { Pagination } from "../../models/job";

interface PaginationControlsProps {
	pagination: Pagination;
	onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ pagination, onPageChange }) => {
	const { currentPage, totalPages } = pagination;
	if (totalPages <= 1) return null;

	const getPageNumbers = () => {
		const pages: (number | '...')[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (currentPage > 3) pages.push('...');
			for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
				pages.push(i);
			}
			if (currentPage < totalPages - 2) pages.push('...');
			pages.push(totalPages);
		}
		return pages;
	};

	return (
		<div className="flex items-center justify-center gap-1 mt-4">
			<button
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage === 1}
				className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
			>
				Previous
			</button>
			{getPageNumbers().map((page, idx) =>
				page === '...' ? (
					<span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">...</span>
				) : (
					<button
						key={page}
						onClick={() => onPageChange(page)}
						className={`px-3 py-1.5 text-sm rounded border ${
							page === currentPage
								? 'bg-gray-800 text-white border-gray-800'
								: 'border-gray-300 hover:bg-gray-50'
						}`}
					>
						{page}
					</button>
				)
			)}
			<button
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage === totalPages}
				className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
			>
				Next
			</button>
		</div>
	);
};

export default PaginationControls;
