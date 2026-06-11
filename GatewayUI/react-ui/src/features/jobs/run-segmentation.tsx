import React from 'react';
import { observer } from 'mobx-react-lite';
import toast from 'react-hot-toast';
import { useStore } from '../../app/stores/store';
import { SegmentationJob } from '../../app/models/job';
import SegmentationJobForm from './segmentation-job-form';

interface RunSegmentationProps {
	onJobSubmitted?: () => void;
}

const RunSegmentation: React.FC<RunSegmentationProps> = ({ onJobSubmitted }) => {
	const { jobStore } = useStore();

	const handleSubmit = async (job: SegmentationJob) => {
		try {
			const result = await jobStore.submitSegmentationJob(job);
			if (result) {
				toast.success('Segmentation job submitted successfully');
				if (onJobSubmitted) onJobSubmitted();
			} else {
				toast.error('Failed to submit segmentation job');
			}
		} catch (error: any) {
			const msg = error?.message || error?.Message || 'Failed to submit segmentation job';
			toast.error(msg);
		}
	};

	return (
		<div>
			<p className="text-gray-500 mb-8">
				Upload a binarized .tif microscopy image to segment particles into voxelized data. The output .json file can be used directly as input for a LOVAMAP analysis job.
			</p>
			<SegmentationJobForm onSubmit={handleSubmit} />
		</div>
	);
};

export default observer(RunSegmentation);
