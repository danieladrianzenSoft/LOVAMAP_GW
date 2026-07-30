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
			// Surface the API error message to the user
			const msg = error?.message || error?.Message || error?.statusText || '';

			// Parse [INPUT] errors from Core for user-friendly messages
			if (msg.includes('Missing required parameters')) {
				toast.error(msg.replace(/.*\[INPUT\]\s*Error:\s*/, ''));
			} else if (msg) {
				toast.error(msg);
			} else {
				toast.error('Failed to submit segmentation job. Please try again.');
			}
		}
	};

	return (
		<div>
			<p className="text-gray-500 mb-6">
				Segment particles from a 3D microscopy image into voxelized particle data. The output can be used directly as input for a LOVAMAP pore-network analysis.
			</p>
			<SegmentationJobForm onSubmit={handleSubmit} />
		</div>
	);
};

export default observer(RunSegmentation);
