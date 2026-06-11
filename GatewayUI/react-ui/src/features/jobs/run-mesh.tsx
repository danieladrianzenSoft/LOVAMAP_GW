import React from 'react';
import { observer } from 'mobx-react-lite';
import toast from 'react-hot-toast';
import { useStore } from '../../app/stores/store';
import { MeshJob } from '../../app/models/job';
import MeshJobForm from './mesh-job-form';

interface RunMeshProps {
	onJobSubmitted?: () => void;
}

const RunMesh: React.FC<RunMeshProps> = ({ onJobSubmitted }) => {
	const { jobStore } = useStore();

	const handleSubmit = async (job: MeshJob) => {
		try {
			const result = await jobStore.submitMeshJob(job);
			if (result) {
				toast.success('Mesh job submitted successfully');
				if (onJobSubmitted) onJobSubmitted();
			} else {
				toast.error('Failed to submit mesh job');
			}
		} catch (error: any) {
			const msg = error?.message || error?.Message || 'Failed to submit mesh job';
			toast.error(msg);
		}
	};

	return (
		<div>
			<p className="text-gray-500 mb-8">
				Generate 3D meshes for visualization from voxelized .json data or .dat files. The .json format is the same output produced by particle segmentation and the standard input for LOVAMAP analysis.
			</p>
			<MeshJobForm onSubmit={handleSubmit} />
		</div>
	);
};

export default observer(RunMesh);
