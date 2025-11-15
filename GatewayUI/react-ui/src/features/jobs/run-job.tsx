import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import UploadFile from '../../app/common/upload-file/upload-file';
import { useStore } from '../../app/stores/store';
import toast from "react-hot-toast";
import { Job } from '../../app/models/job';
import ScaffoldGroupDetailsForm from './scaffold-group-details-form';
import { ScaffoldGroupMatch } from '../../app/models/scaffoldGroup';
import { InputGroup } from '../../app/models/inputGroup';
import MatchPicker from './match-picker';
import JobForm from './job-form';
// import { FaSpinner, FaPlus, FaStar, FaRegStar, FaTimes } from 'react-icons/fa';

const RunJob: React.FC = () => {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { jobStore, userStore } = useStore();
	const { submitJob } = jobStore;
	const [matches, setMatches] = useState<ScaffoldGroupMatch[] | null>(null);
	const [preparedInputGroup, setPreparedInputGroup] = useState<InputGroup | null>(null);
	const [preparedJob, setPreparedJob] = useState<Job | null>(null);
	const [selectedScaffoldGroupId, setSelectedScaffoldGroupId] = useState<number | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [showJobForm, setShowJobForm] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [jobSubmissionStage, setJobSubmissionStage] = useState(1);
	

	const isAdmin = userStore.user?.roles?.includes("administrator") ?? false;

	const handleMatchesFound = (m: ScaffoldGroupMatch[]) => {
		setMatches(m);
		setJobSubmissionStage(2);
	};

	const handleReadyInputGroup = (ig: InputGroup) => {
		setPreparedInputGroup(ig);
		setStatus("Input group prepared.");
	};

	const handlePickMatch = (scaffoldGroupId: number | null) => {
		setSelectedScaffoldGroupId(scaffoldGroupId);
		// If user chose an existing group, go straight to job details step
		// setShowJobForm(true);
		setJobSubmissionStage(3);
		setStatus(scaffoldGroupId ? `Using scaffold group ${scaffoldGroupId}` : "Will create a new scaffold group.");
	};

	const handleGoBack = () => {
		if (jobSubmissionStage === 2) {
			setMatches(null);
			setStatus(null);
		}
		if (jobSubmissionStage > 1) {
			setJobSubmissionStage(jobSubmissionStage - 1);
		}
	}
	
	const handleSubmitJob = async (files: File[]) => {
		try {
			// Handle CSV files
			// const csvFiles = files.filter(file => file.name.endsWith(".csv"));
			if (!files || files.length === 0) {
				toast.error("Please select a file first.");
				return;
			}
			if (preparedInputGroup === null || selectedScaffoldGroupId === null) {
				toast.error("Error getting selected scaffold group details");
				return;
			}

			setIsLoading(true);

			const file = files[0];

			if (file.name.endsWith(".csv")) {
				const job: Job = {
					csvFile: file,
					datFile: null,
					jsonFile: null,
					jobId: crypto.randomUUID(),  // or any unique ID
					dx: preparedInputGroup.dx ?? 2,
					scaffoldGroupId: selectedScaffoldGroupId ?? 0
				};
				const dx = 1;
				const jobResponse =  await submitJob(job, dx); // Use descriptorTypes
				console.log(job)
				console.log(jobResponse);
			}
			setJobSubmissionStage(4);
		} catch (error) {
			console.error(error);
			toast.error('Failed to upload files.');
		} finally {
			setIsLoading(false);
		}
	}

	const handleUploadError = (group: any) => {
		toast.error('Failed to upload files.');
	};

	return (
		<div className={`container mx-auto py-8 px-2`}>
			<div className="text-3xl text-gray-700 font-bold mb-12">Run LOVAMAP</div>
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
				
				{isAdmin && (
					<div className="p-8">
						{jobSubmissionStage === 1 && (
							<ScaffoldGroupDetailsForm
								onMatchesFound={handleMatchesFound}
								onReady={handleReadyInputGroup}
								onStatus={(m) => setStatus(m)}
							/>
						)}
						{jobSubmissionStage === 2 && (
							<MatchPicker
								matches={matches ?? []}
								onNext={(id) => handlePickMatch(id)}
								onBack={handleGoBack}
							/>
						)}
						{jobSubmissionStage === 3 && (
							<JobForm
								onUploadSubmit={handleSubmitJob}
								onUploadError={handleUploadError}
								onBack={handleGoBack}
							/>
						)}
						{jobSubmissionStage === 4 && (
							<div>
								Job submitted successfully.
							</div>
						)}
					</div>
					
				)}
				
				{/* {isAdmin && (
					<UploadFile
						acceptedFileTypes={{ 
							'application/json': ['.json'],
							'text/csv': ['.csv'],
							'application/octet-stream': ['.dat']
						}}
						onUploadSubmit={handleUploadSubmitFile}
						onUploadError={handleUploadError}
					/> 
				)} */}

			</div>
		</div>
	);
};

export default observer(RunJob);