import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import toast from 'react-hot-toast';
import { useStore } from '../../app/stores/store';
import { Job, JobForList, LovamapFromSourceJob } from '../../app/models/job';
import LovamapJobForm from './lovamap-job-form';

interface RunLovamapProps {
	onJobSubmitted?: () => void;
}

const RunLovamap: React.FC<RunLovamapProps> = ({ onJobSubmitted }) => {
	const { jobStore } = useStore();
	const [segmentationJobs, setSegmentationJobs] = useState<JobForList[]>([]);

	useEffect(() => {
		const fetchJobs = async () => {
			const jobs = await jobStore.getUserJobs();
			if (jobs) {
				setSegmentationJobs(
					jobs.filter(
						(j) =>
							j.jobType === 'ParticleSegmentation' &&
							(j.status ?? '').toLowerCase() === 'completed'
					)
				);
			}
		};
		fetchJobs();
	}, [jobStore]);

	const handleUploadSubmit = async (job: Job) => {
		try {
			const result = await jobStore.submitJob(job);
			if (result) {
				toast.success('LOVAMAP job submitted successfully');
				if (onJobSubmitted) onJobSubmitted();
			} else {
				toast.error('Failed to submit LOVAMAP job');
			}
		} catch (error: any) {
			const msg = error?.message || error?.Message || 'Failed to submit LOVAMAP job';
			toast.error(msg);
		}
	};

	const handleSourceSubmit = async (sourceJob: LovamapFromSourceJob) => {
		try {
			const result = await jobStore.submitLovamapFromSource(sourceJob);
			if (result) {
				toast.success('LOVAMAP job submitted successfully');
				if (onJobSubmitted) onJobSubmitted();
			} else {
				toast.error('Failed to submit LOVAMAP analysis');
			}
		} catch (error: any) {
			const msg = error?.message || error?.Message || 'Failed to submit LOVAMAP analysis';
			toast.error(msg);
		}
	};

	return (
		<div>
			<p className="text-gray-500 mb-8">
				Run pore network analysis on particle data. Select the output of a previous particle segmentation job, or upload a standalone particle data file.
			</p>
			<LovamapJobForm
				segmentationJobs={segmentationJobs}
				onUploadSubmit={handleUploadSubmit}
				onSourceSubmit={handleSourceSubmit}
			/>
		</div>
	);
};

export default observer(RunLovamap);
