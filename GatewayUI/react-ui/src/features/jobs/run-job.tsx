import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import UploadFile from '../../app/common/upload-file/upload-file';
import { useStore } from '../../app/stores/store';
import toast from "react-hot-toast";
import { Job } from '../../app/models/job';
// import { FaSpinner, FaPlus, FaStar, FaRegStar, FaTimes } from 'react-icons/fa';

const RunJob: React.FC = () => {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { jobStore } = useStore();
	const { submitJob } = jobStore;
	
	const handleUploadSubmitFile = async (files: File[]) => {
		try {
			// Handle CSV files
			// const csvFiles = files.filter(file => file.name.endsWith(".csv"));
			setIsLoading(true);
			const file = files[0];
			if (file.name.endsWith(".csv")) {
				const job: Job = {
					csvFile: file,
					datFile: null,
					jsonFile: null,
					jobId: crypto.randomUUID(),  // or any unique ID
					dx: 1
				};
				const dx = 1;
				const jobResponse =  await submitJob(job, dx); // Use descriptorTypes
				console.log(jobResponse);
			}

			// Handle JSON uploads
			// const jsonFiles = files.filter(file => file.type === 'application/json');
			
			// if (jsonFiles.length > 0) {
			// 	const parsedJson = await Promise.all(jsonFiles.map(file => file.text().then(JSON.parse)));
			// 	const combinedJson = parsedJson.flat();
			// 	// await scaffoldGroupStore.uploadScaffoldGroupBatch(combinedJson);
			// }
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			console.error(error);
			toast.error('Failed to upload files.');
		}
	}

	const handleUploadError = (group: any) => {
		toast.error('Failed to upload files.');
	};

	return (
		<div className={`container mx-auto py-8 px-2`}>
			<div className="text-3xl text-gray-700 font-bold mb-12">Run job</div>
			<UploadFile
				acceptedFileTypes={{ 
					'application/json': ['.json'],
					'text/csv': ['.csv'],
					'application/octet-stream': ['.dat']
				 }}
				onUploadSubmit={handleUploadSubmitFile}
				onUploadError={handleUploadError}
			/>
		</div>
	);
};

export default observer(RunJob);