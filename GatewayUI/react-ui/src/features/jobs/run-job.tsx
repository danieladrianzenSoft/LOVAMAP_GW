import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import UploadFile from '../../app/common/upload-file/upload-file';
import { useStore } from '../../app/stores/store';
import toast from "react-hot-toast";
import { Job } from '../../app/models/job';
// import { FaSpinner, FaPlus, FaStar, FaRegStar, FaTimes } from 'react-icons/fa';

const RunJob: React.FC = () => {
	const [, setIsLoading] = useState<boolean>(true);
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
			<div className="text-3xl text-gray-700 font-bold mb-12">Run LOVAMAP</div>
			{process.env.REACT_APP_ENV === 'preproduction' ? (
				<UploadFile
					acceptedFileTypes={{ 
						'application/json': ['.json'],
						'text/csv': ['.csv'],
						'application/octet-stream': ['.dat']
					}}
					onUploadSubmit={handleUploadSubmitFile}
					onUploadError={handleUploadError}
				/> 
			) : ( 
				<div>
					<div className='text-xl text-gray-700 font-bold inline mt-12'>Run online - 
						<p className='text-gray-400 ml-16'>coming soon...</p>
					</div>

					<div className='mt-12'>
						<p>
							In the meantime, for inquiries including simulations of specific scaffold configurations 
							or LOVAMAP experimental dataset analysis, {" "}
							<a
								href="mailto:admin@lovamap.com"
								className="text-blue-600 hover:underline"
							>
								contact us. {" "}
							</a>
							The legacy MATLAB version of LOVAMAP will also soon be publically accessible via GitHub.
						</p>
					</div>

				</div>
			)}
		</div>
	);
};

export default observer(RunJob);