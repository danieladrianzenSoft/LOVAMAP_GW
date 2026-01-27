import { useStore } from '../../app/stores/store';
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";
import RunJob from "./run-job";
import { JobForList } from '../../app/models/job';
import { formatDate } from '../../app/utils/format-date';
import JobDetail from './job-detail';
import { FaSpinner } from 'react-icons/fa';

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
		<div className={`container mx-auto py-8 px-2`}>
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
							<div className="mt-2 flex w-full justify-end">
								<button className="button-primary items-center content-center w-36" onClick={() => setShowRunJob(true)}>
									Submit Job
								</button>
							</div>
							<div className="flex">
								<div className="w-full overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200 text-sm">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Id</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{jobs?.map((job, index) => (
												<tr key={job.id} className="hover:bg-gray-50 hover:cursor-pointer"
													onClick={() => setSelectedJob(job)}
												>
													<td className="px-4 py-4 text-sm text-gray-700">{index + 1}</td>
													<td className="px-4 py-4"> {job.id}</td>
													<td className="px-4 py-4">{formatDate(job.submittedAt)}</td>
													<td className="px-4 py-4">{job.status}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
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