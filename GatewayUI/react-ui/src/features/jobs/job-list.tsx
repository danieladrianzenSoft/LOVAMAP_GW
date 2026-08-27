import { useStore } from '../../app/stores/store';
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import RunLovamap from "./run-lovamap";
import RunSegmentation from "./run-segmentation";
import RunMesh from "./run-mesh";
import { JobForList, Pagination, ToolVersions } from '../../app/models/job';
import { formatDate } from '../../app/utils/format-date';
import JobDetail from './job-detail';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';
import DataTable, { DataTableColumn } from '../../app/common/data-table/data-table';
import ElapsedTime from './elapsed-time';

const formatJobType = (jobType?: string): string => {
	switch (jobType) {
		case 'Lovamap': return 'LOVAMAP';
		case 'ParticleSegmentation': return 'Segmentation';
		case 'MeshProcessing': return 'Mesh';
		default: return jobType ?? '—';
	}
};

const BetaBadge: React.FC = () => (
	<span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 leading-none align-middle">
		Beta
	</span>
);

const VersionBadge: React.FC<{ version: string | null | undefined }> = ({ version }) => {
	if (!version) return null;
	return (
		<span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide bg-gray-100 text-gray-500 leading-none align-middle">
			{version}
		</span>
	);
};

const getVersionForMode = (mode: string, versions: ToolVersions | null): string | null => {
	if (!versions) return null;
	switch (mode) {
		case 'lovamap': return versions.lovamap;
		case 'segmentation': return versions.particleSegmentation;
		case 'mesh': return versions.segmentationWorkflows;
		default: return null;
	}
};

const jobTypeCards = [
	{
		mode: 'segmentation' as const,
		title: 'Particle Segmentation',
		description: 'Segment microscope .tif images into voxelized particle data (.json) and a 3D mesh for visualization. The output is ready for direct use in a LOVAMAP analysis job.',
		beta: false,
	},
	{
		mode: 'lovamap' as const,
		title: 'LOVAMAP Analysis',
		description: 'Run pore network analysis on particle data. Accepts .dat files (spherical coordinates) or .json files (voxelized data).',
		beta: true,
	},
	{
		mode: 'mesh' as const,
		title: 'Mesh Generation',
		description: 'Transform voxelized .json data or .dat files into 3D meshes for visualization. Accepts the same .json format output by particle segmentation and used as input for LOVAMAP analysis.',
		beta: false,
	},
];

/* ── Sub-view: Page header with optional back arrow ── */
const PageHeader: React.FC<{ title: React.ReactNode; backTo?: string }> = ({ title, backTo }) => {
	const navigate = useNavigate();
	return (
		<h1 className="text-3xl text-gray-700 font-bold mb-8 flex items-center gap-3">
			{backTo && (
				<button
					onClick={() => navigate(backTo)}
					className="text-gray-500 hover:text-gray-700 transition-colors"
					aria-label="Go back"
				>
					<FaArrowLeft className="w-5 h-5" />
				</button>
			)}
			{title}
		</h1>
	);
};

/* ── Sub-view: Pagination controls ── */
const PaginationControls: React.FC<{
	pagination: Pagination;
	onPageChange: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
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

/* ── Sub-view: Job table (default /jobs) ── */
const JobTableView: React.FC<{
	jobs: JobForList[];
	isAdmin: boolean;
	pagination: Pagination | null;
	onPageChange: (page: number) => void;
	toolVersions: ToolVersions | null;
}> = observer(({ jobs, isAdmin, pagination, onPageChange, toolVersions }) => {
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

	return (
		<>
			<PageHeader title="Jobs" />
			<h2 className="text-lg font-semibold text-gray-700 mb-3">Submit Job</h2>
			{/* Compact buttons on smaller screens */}
			<div className="flex flex-col gap-2 mb-6 lg:hidden">
				{jobTypeCards.map((card) => (
					<button
						key={card.mode}
						className="group flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-400 hover:shadow-sm transition-all bg-white"
						onClick={() => navigate(`/jobs/new/${card.mode}`)}
					>
						<span className="text-sm font-semibold text-gray-800">
							{card.title}
							{card.beta && <BetaBadge />}
							<VersionBadge version={getVersionForMode(card.mode, toolVersions)} />
						</span>
						<span className="text-gray-400 group-hover:text-gray-600 transition-colors" aria-hidden="true">&rarr;</span>
					</button>
				))}
			</div>
			{/* Full cards on large+ screens */}
			<div className="hidden lg:grid lg:grid-cols-3 gap-4 mb-8">
				{jobTypeCards.map((card) => (
					<button
						key={card.mode}
						className="group text-left border border-gray-200 rounded-xl p-5 hover:border-gray-400 hover:shadow-md transition-all bg-white flex flex-col"
						onClick={() => navigate(`/jobs/new/${card.mode}`)}
					>
						<div className="w-full h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-sm text-center px-3">
							{card.title}
						</div>
						<h3 className="text-base font-semibold text-gray-800 mb-1">
							{card.title}
							{card.beta && <BetaBadge />}
							<VersionBadge version={getVersionForMode(card.mode, toolVersions)} />
						</h3>
						<p className="text-sm text-gray-500 leading-snug mb-3 flex-1">{card.description}</p>
						<span className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors flex justify-end" aria-hidden="true">
							&rarr;
						</span>
					</button>
				))}
			</div>
			<div className="flex flex-col">
				<DataTable
					data={jobs ?? []}
					columns={jobColumns}
					onRowClick={(job) => navigate(`/jobs/${job.id.substring(0, 8)}`)}
					rowKey={(job) => job.id}
				/>
				{pagination && (
					<PaginationControls pagination={pagination} onPageChange={onPageChange} />
				)}
			</div>
		</>
	);
});

/* ── Sub-view: Job type selection card grid (/jobs/new) ── */
const JobTypeGrid: React.FC<{ toolVersions: ToolVersions | null }> = ({ toolVersions }) => {
	const navigate = useNavigate();
	return (
		<>
			<PageHeader title="Submit Job" backTo="/jobs" />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{jobTypeCards.map((card) => (
					<button
						key={card.mode}
						className="text-left border border-gray-200 rounded-xl p-6 hover:border-gray-400 hover:shadow-md transition-all bg-white"
						onClick={() => navigate(`/jobs/new/${card.mode}`)}
					>
						<div className="w-full h-24 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400 text-sm">
							{card.title}
						</div>
						<h3 className="text-lg font-semibold text-gray-800 mb-2">
							{card.title}
							{card.beta && <BetaBadge />}
							<VersionBadge version={getVersionForMode(card.mode, toolVersions)} />
						</h3>
						<p className="text-sm text-gray-500">{card.description}</p>
					</button>
				))}
			</div>
		</>
	);
};

/* ── Sub-view wrappers for each form ── */
const LovamapFormView: React.FC<{ onSubmitted: () => void; toolVersions: ToolVersions | null }> = ({ onSubmitted, toolVersions }) => (
	<>
		<PageHeader title={<>LOVAMAP Analysis<BetaBadge /><VersionBadge version={toolVersions?.lovamap} /></>} backTo="/jobs" />
		<RunLovamap onJobSubmitted={onSubmitted} />
	</>
);

const SegmentationFormView: React.FC<{ onSubmitted: () => void; toolVersions: ToolVersions | null }> = ({ onSubmitted, toolVersions }) => (
	<>
		<PageHeader title={<>Particle Segmentation<VersionBadge version={toolVersions?.particleSegmentation} /></>} backTo="/jobs" />
		<RunSegmentation onJobSubmitted={onSubmitted} />
	</>
);

const MeshFormView: React.FC<{ onSubmitted: () => void; toolVersions: ToolVersions | null }> = ({ onSubmitted, toolVersions }) => (
	<>
		<PageHeader title={<>Mesh Generation<VersionBadge version={toolVersions?.segmentationWorkflows} /></>} backTo="/jobs" />
		<RunMesh onJobSubmitted={onSubmitted} />
	</>
);

/* ── Sub-view: Job detail by short ID (/jobs/:jobId) ── */
const JobDetailView: React.FC<{ jobs: JobForList[]; onDownloadResults: (jobId: string, name?: string) => Promise<void>; onJobSubmitted: () => void }> = ({ jobs, onDownloadResults, onJobSubmitted }) => {
	const { jobId } = useParams<{ jobId: string }>();
	const navigate = useNavigate();

	const job = jobs.find((j) => j.id.startsWith(jobId ?? ''));

	if (!job) {
		return (
			<div className="flex justify-center items-center py-8">
				<FaSpinner className="animate-spin" size={40} />
			</div>
		);
	}

	return (
		<JobDetail
			job={job as any}
			onBack={() => navigate('/jobs')}
			onJobSubmitted={onJobSubmitted}
			formatDate={formatDate}
			onDownloadResults={onDownloadResults}
		/>
	);
};

/* ── Main component: wraps all sub-routes ── */
const JobList: React.FC = () => {
	const { jobStore, userStore } = useStore();
	const { getUserJobs, getAllJobs, getJobResult, startConnection, stopConnection, loadToolVersions } = jobStore;
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const navigate = useNavigate();

	const isLoggedIn = !!userStore.user;
	const isAdmin = !!userStore.user?.roles?.includes('administrator');

	const fetchJobs = useCallback(async () => {
		if (!isLoggedIn) return;
		setIsLoading(true);
		if (isAdmin) {
			await getAllJobs();
		} else {
			await getUserJobs();
		}
		setIsLoading(false);
	}, [getUserJobs, getAllJobs, isLoggedIn, isAdmin, jobStore.currentPage]);

	const handlePageChange = useCallback(async (page: number) => {
		jobStore.setPage(page);
		await fetchJobs();
	}, [jobStore, fetchJobs]);

	const downloadJobResults = useCallback(
		async (jobId: string, suggestedFileName?: string) => {
			if (!isLoggedIn) return;

			const blob = await getJobResult(jobId);
			if (!blob) return;

			const fileBlob = blob.type ? blob : new Blob([blob], { type: "application/json" });

			const url = window.URL.createObjectURL(fileBlob);
			try {
				const a = document.createElement("a");
				a.href = url;
				a.download = suggestedFileName ?? `job_${jobId}_results.json`;
				document.body.appendChild(a);
				a.click();
				a.remove();
			} finally {
				window.URL.revokeObjectURL(url);
			}
		},
		[getJobResult, isLoggedIn]
	);

	useEffect(() => {
		if (!isLoggedIn) return;
		fetchJobs();
		loadToolVersions();
	}, [fetchJobs, isLoggedIn, loadToolVersions]);

	useEffect(() => {
		if (!isLoggedIn) return;
		startConnection();
		return () => { stopConnection(); };
	}, [isLoggedIn, startConnection, stopConnection]);

	const handleJobSubmitted = async () => {
		jobStore.setPage(1);
		await fetchJobs();
		navigate('/jobs');
	};

	if (isLoading) {
		return (
			<div className="container mx-auto py-8 px-6">
				<div className="flex justify-center items-center py-8">
					<FaSpinner className="animate-spin" size={40} />
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 px-6">
			<Routes>
				<Route index element={<JobTableView jobs={jobStore.jobsRan} isAdmin={isAdmin} pagination={jobStore.pagination} onPageChange={handlePageChange} toolVersions={jobStore.toolVersions} />} />
				<Route path="new" element={<JobTypeGrid toolVersions={jobStore.toolVersions} />} />
				<Route path="new/lovamap" element={<LovamapFormView onSubmitted={handleJobSubmitted} toolVersions={jobStore.toolVersions} />} />
				<Route path="new/segmentation" element={<SegmentationFormView onSubmitted={handleJobSubmitted} toolVersions={jobStore.toolVersions} />} />
				<Route path="new/mesh" element={<MeshFormView onSubmitted={handleJobSubmitted} toolVersions={jobStore.toolVersions} />} />
				<Route path=":jobId" element={<JobDetailView jobs={jobStore.jobsRan} onDownloadResults={downloadJobResults} onJobSubmitted={handleJobSubmitted} />} />
			</Routes>
		</div>
	);
}

export default observer(JobList);
