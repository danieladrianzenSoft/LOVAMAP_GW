import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { validateLovamapFile, LovamapFileValidation } from '../../app/helpers/lovamapFileValidation';
import { Job, JobForList, LovamapFromSourceJob } from '../../app/models/job';
import { Preview3D } from './preview3d';
import { formatDate } from '../../app/utils/format-date';

interface Props {
	segmentationJobs: JobForList[];
	onUploadSubmit: (job: Job) => Promise<void>;
	onSourceSubmit: (job: LovamapFromSourceJob) => Promise<void>;
}

const LovamapJobForm: React.FC<Props> = ({ segmentationJobs, onUploadSubmit, onSourceSubmit }) => {
	const hasSegJobs = segmentationJobs.length > 0;

	// Mode: 'source' or 'upload'
	const [mode, setMode] = useState<'source' | 'upload'>(hasSegJobs ? 'source' : 'upload');

	// Selected segmentation job
	const [selectedJob, setSelectedJob] = useState<JobForList | null>(
		hasSegJobs ? segmentationJobs[0] : null
	);

	// When segmentation jobs load asynchronously, sync mode + selection
	useEffect(() => {
		if (segmentationJobs.length > 0 && !selectedJob) {
			setSelectedJob(segmentationJobs[0]);
			setMode('source');
		}
	}, [segmentationJobs, selectedJob]);

	// Upload state
	const [file, setFile] = useState<File | null>(null);
	const [validation, setValidation] = useState<LovamapFileValidation | null>(null);
	const [isValidating, setIsValidating] = useState(false);

	// Shared state
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Source job options
	const [dx, setDx] = useState<number>(1.0);
	const [generateMesh, setGenerateMesh] = useState(true);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(async (selectedFile: File) => {
		setFile(selectedFile);
		setValidation(null);
		setIsValidating(true);
		try {
			const result = await validateLovamapFile(selectedFile);
			setValidation(result);
		} catch (err) {
			console.error('Validation failed:', err);
			setValidation({ valid: false, error: 'Unexpected validation error.' });
		} finally {
			setIsValidating(false);
		}
	}, []);

	const onDrop = useCallback((accepted: File[]) => {
		if (accepted.length > 0) handleFile(accepted[0]);
	}, [handleFile]);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'application/json': ['.json'],
			'text/plain': ['.dat', '.txt'],
		},
		multiple: false,
	});

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) handleFile(f);
	};

	const handleClear = () => {
		setFile(null);
		setValidation(null);
	};

	const handleModeSwitch = (newMode: 'source' | 'upload') => {
		setMode(newMode);
		if (newMode === 'source') {
			setFile(null);
			setValidation(null);
		}
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			if (mode === 'upload') {
				if (!file || !validation || !validation.valid) return;
				const ext = file.name.toLowerCase().split('.').pop();
				const job: Job = {
					csvFile: null,
					datFile: (ext === 'dat' || ext === 'txt') ? file : null,
					jsonFile: ext === 'json' ? file : null,
					jobId: crypto.randomUUID(),
					dx: 2,
					scaffoldGroupId: 0,
				};
				await onUploadSubmit(job);
			} else {
				if (!selectedJob) return;
				await onSourceSubmit({
					sourceJobId: selectedJob.id,
					dx: dx.toString(),
					generateMesh,
				});
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const canSubmitUpload = file && validation?.valid && !isValidating && !isSubmitting;
	const canSubmitSource = mode === 'source' && selectedJob && !isSubmitting;

	const formatJobLabel = (job: JobForList) =>
		`Segmentation — ${formatDate(job.submittedAt)} — ${job.id.substring(0, 8)}`;

	return (
		<div className="space-y-6">
			{/* Mode selector */}
			<div className="flex gap-2">
				<label
					className={`flex items-center gap-2 cursor-pointer rounded-md border px-4 py-2 transition text-sm ${
						mode === 'source'
							? 'border-link-200 bg-link-50/30 text-link-200 font-medium'
							: hasSegJobs
								? 'border-gray-200 text-gray-500 hover:border-gray-300'
								: 'border-gray-200 text-gray-300 opacity-50 cursor-not-allowed'
					}`}
				>
					<input
						type="radio"
						name="lovamap-input-mode"
						checked={mode === 'source'}
						onChange={() => handleModeSwitch('source')}
						disabled={!hasSegJobs}
						className="accent-link-200"
					/>
					From prior segmentation job
				</label>
				<label
					className={`flex items-center gap-2 cursor-pointer rounded-md border px-4 py-2 transition text-sm ${
						mode === 'upload'
							? 'border-link-200 bg-link-50/30 text-link-200 font-medium'
							: 'border-gray-200 text-gray-500 hover:border-gray-300'
					}`}
				>
					<input
						type="radio"
						name="lovamap-input-mode"
						checked={mode === 'upload'}
						onChange={() => handleModeSwitch('upload')}
						className="accent-link-200"
					/>
					Upload standalone particle data file
				</label>
			</div>

			{/* From source: job selector + dx + generateMesh */}
			{mode === 'source' && hasSegJobs && (
				<div className="space-y-4">
					{/* Custom Listbox dropdown */}
					<div className="flex flex-col text-sm">
						<label className="text-gray-500 mb-1">Particle data source</label>
						<Listbox value={selectedJob} onChange={setSelectedJob}>
							<div className="relative">
								<ListboxButton className="relative w-full cursor-pointer rounded-md border border-gray-200 bg-white py-2 pl-3 pr-10 text-left text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-link-100 transition">
									<span className="block truncate">
										{selectedJob ? formatJobLabel(selectedJob) : 'Select a job...'}
									</span>
									<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
										<svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 111.04 1.08l-4.23 3.35a.75.75 0 01-.94 0L5.21 8.31a.75.75 0 01.02-1.1z" clipRule="evenodd" />
										</svg>
									</span>
								</ListboxButton>
								<ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white border border-gray-200 shadow-lg focus:outline-none">
									{segmentationJobs.map((job) => (
										<ListboxOption
											key={job.id}
											value={job}
											className={({ active, selected }) =>
												`relative cursor-pointer select-none py-2.5 pl-3 pr-9 text-sm ${
													selected ? 'bg-gray-100 font-medium' : active ? 'bg-gray-50' : 'text-gray-700'
												}`
											}
										>
											{({ selected }) => (
												<>
													<span className={`block truncate ${selected ? 'font-medium' : ''}`}>
														{formatJobLabel(job)}
													</span>
													{selected && (
														<span className="absolute inset-y-0 right-0 flex items-center pr-3 text-link-200">
															<FaCheckCircle className="w-3.5 h-3.5" />
														</span>
													)}
												</>
											)}
										</ListboxOption>
									))}
								</ListboxOptions>
							</div>
						</Listbox>
					</div>

					<div className="rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-4">
						<div className="text-sm text-gray-500">
							Run LOVAMAP analysis on the output of the selected particle segmentation job.
						</div>
						<div className="flex items-center gap-3">
							<label className="text-sm text-gray-600 w-28">dx (voxel size)</label>
							<input
								type="number"
								step="0.1"
								min="0.01"
								value={dx}
								onChange={(e) => setDx(parseFloat(e.target.value) || 1)}
								className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
							/>
						</div>
						<div className="flex items-center gap-3">
							<label className="text-sm text-gray-600 w-28">Generate mesh</label>
							<input
								type="checkbox"
								checked={generateMesh}
								onChange={(e) => setGenerateMesh(e.target.checked)}
								className="h-4 w-4"
							/>
						</div>
						<div className="pt-2">
							<button
								type="button"
								onClick={handleSubmit}
								disabled={!canSubmitSource}
								className="button-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{isSubmitting && <FaSpinner className="animate-spin" />}
								{isSubmitting ? 'Submitting...' : 'Submit LOVAMAP Job'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Upload mode: file picker + validation + preview */}
			{mode === 'upload' && (
				<div>
					{!file ? (
						<div>
							<div
								{...getRootProps()}
								className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
									isDragActive ? 'border-link-100 bg-link-50/20' : 'border-gray-300 hover:border-gray-400'
								}`}
							>
								<input {...getInputProps()} />
								<p className="text-gray-500">
									Drag & drop a <strong>.dat</strong>, <strong>.txt</strong>, or <strong>.json</strong> file here, or click to select
								</p>
								<p className="text-xs text-gray-400 mt-1">
									<strong>.dat/.txt</strong> — four columns per row: x, y, z coordinates and radius (µm) of each spherical particle
								</p>
								<p className="text-xs text-gray-400 mt-0.5">
									<strong>.json</strong> — voxelized particle domain containing 1D voxel-index ranges for each bead
								</p>
							</div>
							<input
								ref={fileInputRef}
								type="file"
								accept=".json,.dat,.txt"
								onChange={handleFileInput}
								className="hidden"
							/>
						</div>
					) : (
						<div>
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<span className="font-medium text-gray-700">{file.name}</span>
									<span className="text-xs text-gray-400">
										({(file.size / (1024 * 1024)).toFixed(1)} MB)
									</span>
								</div>
								<button
									type="button"
									className="text-sm text-link-200 hover:underline"
									onClick={handleClear}
									disabled={isSubmitting}
								>
									Change file
								</button>
							</div>

							{isValidating && (
								<div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
									<FaSpinner className="animate-spin" /> Validating file...
								</div>
							)}

							{validation && !isValidating && (
								<div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
									<div className="text-sm font-medium text-gray-700 mb-2">File Validation</div>

									<div className="flex flex-wrap gap-3 mb-3">
										{validation.valid ? (
											<>
												{validation.type === 'dat' && (
													<span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
														<FaCheckCircle /> {validation.particleCount.toLocaleString()} particles
													</span>
												)}
												{validation.type === 'json' && (
													<>
														<span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
															<FaCheckCircle /> {validation.beadCount.toLocaleString()} beads
														</span>
														<span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
															<FaCheckCircle /> Domain: {Array.isArray(validation.domainSize) ? validation.domainSize.join(' x ') : validation.domainSize}
														</span>
														<span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
															<FaCheckCircle /> Voxel size: {Array.isArray(validation.voxelSize) ? validation.voxelSize.join(' x ') : validation.voxelSize}
														</span>
													</>
												)}
											</>
										) : (
											<span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
												<FaExclamationTriangle /> {validation.error}
											</span>
										)}
									</div>
								</div>
							)}

							{/* 3D Preview */}
							{validation && !isValidating && validation.valid && (() => {
								const ext = file.name.toLowerCase().split('.').pop();
								if (ext === 'dat' || ext === 'txt') {
									return <div className="mb-6"><Preview3D file={file} /></div>;
								}
								if (ext === 'json') {
									return (
										<div className="mb-6 border rounded-md bg-gray-50 h-64 flex items-center justify-center text-sm text-gray-400">
											No preview available for .json files
										</div>
									);
								}
								return null;
							})()}

							{/* Submit */}
							<div className="pt-4">
								<button
									type="button"
									onClick={handleSubmit}
									disabled={!canSubmitUpload}
									className="button-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{isSubmitting && <FaSpinner className="animate-spin" />}
									{isSubmitting ? 'Submitting...' : 'Submit LOVAMAP Job'}
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default LovamapJobForm;
