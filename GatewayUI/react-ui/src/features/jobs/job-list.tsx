import { useStore } from '../../app/stores/store';
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import RunLovamap from "./run-lovamap";
import RunSegmentation from "./run-segmentation";
import RunMesh from "./run-mesh";
import { JobForList } from '../../app/models/job';
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

/* ── Sub-view: Job table (default /jobs) ── */
const JobTableView: React.FC<{ jobs: JobForList[]; isAdmin: boolean }> = observer(({ jobs, isAdmin }) => {
	const navigate = useNavigate();

	const jobColumns: DataTableColumn<JobForList>[] = [
		{ header: '#', render: (_job, index) => index + 1 },
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
			<div className="mb-2 flex w-full justify-end">
				<button className="button-primary items-center content-center w-36" onClick={() => navigate('/jobs/new')}>
					Submit Job
				</button>
			</div>
			<div className="flex">
				<DataTable
					data={jobs ?? []}
					columns={jobColumns}
					onRowClick={(job) => navigate(`/jobs/${job.id.substring(0, 8)}`)}
					rowKey={(job) => job.id}
				/>
			</div>
		</>
	);
});

/* ── Sub-view: Job type selection card grid (/jobs/new) ── */
const JobTypeGrid: React.FC = () => {
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
						<h3 className="text-lg font-semibold text-gray-800 mb-2">{card.title}{card.beta && <BetaBadge />}</h3>
						<p className="text-sm text-gray-500">{card.description}</p>
					</button>
				))}
			</div>
		</>
	);
};

/* ── Sub-view wrappers for each form ── */
const LovamapFormView: React.FC<{ onSubmitted: () => void }> = ({ onSubmitted }) => (
	<>
		<PageHeader title={<>LOVAMAP Analysis<BetaBadge /></>} backTo="/jobs/new" />
		<RunLovamap onJobSubmitted={onSubmitted} />
	</>
);

const SegmentationFormView: React.FC<{ onSubmitted: () => void }> = ({ onSubmitted }) => (
	<>
		<PageHeader title="Particle Segmentation" backTo="/jobs/new" />
		<RunSegmentation onJobSubmitted={onSubmitted} />
	</>
);

const MeshFormView: React.FC<{ onSubmitted: () => void }> = ({ onSubmitted }) => (
	<>
		<PageHeader title="Mesh Generation" backTo="/jobs/new" />
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
	const { getUserJobs, getAllJobs, getJobResult, startConnection, stopConnection } = jobStore;
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
	}, [getUserJobs, getAllJobs, isLoggedIn, isAdmin]);

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
	}, [fetchJobs, isLoggedIn]);

	useEffect(() => {
		if (!isLoggedIn) return;
		startConnection();
		return () => { stopConnection(); };
	}, [isLoggedIn, startConnection, stopConnection]);

	const handleJobSubmitted = async () => {
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
				<Route index element={<JobTableView jobs={jobStore.jobsRan} isAdmin={isAdmin} />} />
				<Route path="new" element={<JobTypeGrid />} />
				<Route path="new/lovamap" element={<LovamapFormView onSubmitted={handleJobSubmitted} />} />
				<Route path="new/segmentation" element={<SegmentationFormView onSubmitted={handleJobSubmitted} />} />
				<Route path="new/mesh" element={<MeshFormView onSubmitted={handleJobSubmitted} />} />
				<Route path=":jobId" element={<JobDetailView jobs={jobStore.jobsRan} onDownloadResults={downloadJobResults} onJobSubmitted={handleJobSubmitted} />} />
			</Routes>
		</div>
	);
}

export default observer(JobList);
