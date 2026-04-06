import { useStore } from '../../app/stores/store';
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";
import RunJob from "./run-job";
import { JobForList } from '../../app/models/job';
import { formatDate } from '../../app/utils/format-date';
import JobDetail from './job-detail';
import { FaSpinner } from 'react-icons/fa';
import DataTable, { DataTableColumn } from '../../app/common/data-table/data-table';

const JobList: React.FC = () => {
	const { jobStore, userStore } = useStore();
	const { getUserJobs, getJobResult } = jobStore;
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [jobs, setJobs] = useState<JobForList[]>([]);
	const [showRunJob, setShowRunJob] = useState<boolean>(false);
	const [selectedJob, setSelectedJob] = useState<JobForList | null>(null);

	const isLoggedIn = !!userStore.user;

	useEffect(() => {
		if (!isLoggedIn || !selectedJob) return;
		const updated = jobs.find((j) => j.id === selectedJob.id);
		if (updated) setSelectedJob(updated);
	}, [isLoggedIn, jobs, selectedJob]);


	const fetchJobs = useCallback(async () => {
		if (!isLoggedIn) return;
		setIsLoading(true);
		const results = await getUserJobs();
		console.log(results);
		setJobs(results ?? []);
		setIsLoading(false);
	}, [getUserJobs, isLoggedIn]);

	const downloadJobResults = useCallback(
		async (jobId: string, suggestedFileName?: string) => {
			if (!isLoggedIn) return;

			const blob = await getJobResult(jobId);
			if (!blob) return;

			// Ensure it's treated as JSON (helps some browsers)
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

	const handlejobSubmitted = async () => {
		if (!isLoggedIn) return;
		setShowRunJob(false);
		await fetchJobs();
	}

	const jobColumns: DataTableColumn<JobForList>[] = [
		{ header: '#', render: (_job, index) => index + 1 },
		{ header: 'Id', render: (job) => job.id },
		{ header: 'Date', render: (job) => formatDate(job.submittedAt) },
		{ header: 'Status', render: (job) => job.status },
	];

	if (isLoading) {
		return (
			<>
				<div className="flex justify-center items-center py-8">
					<FaSpinner className="animate-spin" size={40} />
				</div>
			</>
		);
	}

	return (
		<div className={`container mx-auto py-8 px-6`}>
			<div className="text-3xl text-gray-700 font-bold mb-12">Jobs</div>
			{selectedJob && !showRunJob ? (
				<JobDetail
					job={selectedJob as any} // ideally type JobForList to include needed fields
					onBack={() => setSelectedJob(null)}
					formatDate={formatDate}
					onDownloadResults={downloadJobResults}
				/>
			) : (
				<>
					{!showRunJob ? (
						<>
							<div className="mb-2 flex w-full justify-end">
								<button className="button-primary items-center content-center w-36" onClick={() => setShowRunJob(true)}>
									Submit Job
								</button>
							</div>
							<div className="flex">
								<DataTable
									data={jobs ?? []}
									columns={jobColumns}
									onRowClick={(job) => setSelectedJob(job)}
									rowKey={(job) => job.id}
								/>
							</div>
						</>
					) : (
						<div>
							<div className="mt-2 flex w-full justify-end">
								<button className="button-primary items-center content-center w-36" onClick={() => setShowRunJob(false)}>
									Cancel
								</button>
							</div>
							<RunJob
								onJobSubmitted={handlejobSubmitted}
							/>
						</div>
					)}
				</>
			)}
		</div>
	)
}

export default observer(JobList);