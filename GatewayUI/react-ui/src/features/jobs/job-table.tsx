import React from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { JobForList, Pagination } from "../../app/models/job";
import DataTable, { DataTableColumn } from "../../app/common/data-table/data-table";
import PaginationControls from "../../app/common/pagination-controls/pagination-controls";
import ElapsedTime from "./elapsed-time";
import { formatDate } from "../../app/utils/format-date";

export const formatJobType = (jobType?: string): string => {
	switch (jobType) {
		case 'Lovamap': return 'LOVAMAP';
		case 'ParticleSegmentation': return 'Segmentation';
		case 'MeshProcessing': return 'Mesh';
		default: return jobType ?? '—';
	}
};

export interface JobTableFilters {
	status: string;
	jobType: string;
	search: string;
	onStatusChange: (value: string) => void;
	onJobTypeChange: (value: string) => void;
	onSearchChange: (value: string) => void;
	onClear: () => void;
}

interface JobTableProps {
	jobs: JobForList[];
	isAdmin: boolean;
	pagination: Pagination | null;
	onPageChange: (page: number) => void;
	filters?: JobTableFilters | null;
	isLoading?: boolean;
	emptyMessage?: string;
}

const FilterBar: React.FC<{ filters: JobTableFilters }> = ({ filters }) => (
	<div className="flex flex-wrap items-end gap-3 mb-4">
		<div>
			<label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
			<select
				value={filters.status}
				onChange={(e) => filters.onStatusChange(e.target.value)}
				className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
			>
				<option value="">All</option>
				<option value="Pending">Pending</option>
				<option value="Running">Running</option>
				<option value="Completed">Completed</option>
				<option value="Failed">Failed</option>
				<option value="Stopped">Stopped</option>
			</select>
		</div>
		<div>
			<label className="mb-1 block text-xs font-medium text-gray-500">Job Type</label>
			<select
				value={filters.jobType}
				onChange={(e) => filters.onJobTypeChange(e.target.value)}
				className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
			>
				<option value="">All</option>
				<option value="Lovamap">LOVAMAP</option>
				<option value="ParticleSegmentation">Segmentation</option>
				<option value="MeshProcessing">Mesh</option>
			</select>
		</div>
		<div>
			<label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
			<input
				type="text"
				value={filters.search}
				onChange={(e) => filters.onSearchChange(e.target.value)}
				placeholder="Email, username, or job ID..."
				className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-64"
			/>
		</div>
		{(filters.status || filters.jobType || filters.search) && (
			<button
				onClick={filters.onClear}
				className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
			>
				Clear
			</button>
		)}
	</div>
);

const JobTable: React.FC<JobTableProps> = observer(({
	jobs,
	isAdmin,
	pagination,
	onPageChange,
	filters,
	isLoading,
	emptyMessage = "No jobs found.",
}) => {
	const navigate = useNavigate();
	const pageOffset = pagination ? (pagination.currentPage - 1) * pagination.itemsPerPage : 0;

	const jobColumns: DataTableColumn<JobForList>[] = [
		{ header: '#', render: (_job, index) => pageOffset + index + 1 },
		{ header: 'Id', render: (job) => job.id },
		{ header: 'Type', render: (job) => formatJobType(job.jobType) },
		{ header: 'Date', render: (job) => formatDate(job.submittedAt) },
		{
			header: 'Status',
			render: (job) => {
				const isActive = job.status === 'Pending' || job.status === 'Running';
				return (
					<span className="inline-flex items-center gap-2">
						{job.status}
						{isActive && (
							<span className="text-gray-400">
								<ElapsedTime since={job.submittedAt} />
							</span>
						)}
					</span>
				);
			},
		},
		...(isAdmin ? [{
			header: 'Submitted by',
			render: (job: JobForList) => job.creatorEmail ?? '—',
		}] : []),
	];

	if (isLoading) {
		return <div className="py-6 text-center text-sm text-gray-400">Loading...</div>;
	}

	return (
		<div className="flex flex-col">
			{filters && <FilterBar filters={filters} />}
			<DataTable
				data={jobs ?? []}
				columns={jobColumns}
				onRowClick={(job) => navigate(`/jobs/${job.id.substring(0, 8)}`)}
				rowKey={(job) => job.id}
				emptyMessage={emptyMessage}
			/>
			{pagination && (
				<PaginationControls pagination={pagination} onPageChange={onPageChange} />
			)}
		</div>
	);
});

export default JobTable;
