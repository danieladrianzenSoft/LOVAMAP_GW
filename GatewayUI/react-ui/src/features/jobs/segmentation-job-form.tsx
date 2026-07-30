import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { extractTifMetadata, TifMetadata } from '../../app/helpers/tifMetadata';
import { SegmentationJob } from '../../app/models/job';
import agent from '../../app/api/agent';

interface Props {
	onSubmit: (job: SegmentationJob) => Promise<void>;
}

/** Fallback if the config endpoint is unreachable */
const DEFAULT_MAX_FILE_SIZE_MB = 500;

const SegmentationJobForm: React.FC<Props> = ({ onSubmit }) => {
	const [file, setFile] = useState<File | null>(null);
	const [metadata, setMetadata] = useState<TifMetadata | null>(null);
	const [isExtracting, setIsExtracting] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fileSizeError, setFileSizeError] = useState(false);
	const [maxFileSizeMb, setMaxFileSizeMb] = useState(DEFAULT_MAX_FILE_SIZE_MB);

	// Form fields
	const [dx, setDx] = useState<string>('');
	const [dy, setDy] = useState<string>('');
	const [dz, setDz] = useState<string>('');
	const [fluorescentLabel, setFluorescentLabel] = useState<number>(1);
	const [radiusUm, setRadiusUm] = useState<string>('');
	const [submitAttempted, setSubmitAttempted] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	// Fetch server config on mount
	useEffect(() => {
		agent.Jobs.getConfig()
			.then((cfg) => {
				if (cfg?.maxFileSizeMb > 0) setMaxFileSizeMb(cfg.maxFileSizeMb);
			})
			.catch(() => {
				// keep default
			});
	}, []);

	const maxFileSizeBytes = maxFileSizeMb * 1_000_000;

	const handleFile = useCallback(async (selectedFile: File) => {
		setSubmitAttempted(false);

		if (selectedFile.size > maxFileSizeBytes) {
			setFile(selectedFile);
			setFileSizeError(true);
			setMetadata(null);
			return;
		}

		setFile(selectedFile);
		setFileSizeError(false);
		setIsExtracting(true);
		try {
			const meta = await extractTifMetadata(selectedFile);
			console.log('[SegmentationJobForm] extracted metadata:', meta);
			setMetadata(meta);
			if (meta.dx != null) setDx(meta.dx.toFixed(4));
			if (meta.dy != null) setDy(meta.dy.toFixed(4));
			if (meta.dz != null) setDz(meta.dz.toFixed(4));
		} catch (err) {
			console.error('Metadata extraction failed:', err);
		} finally {
			setIsExtracting(false);
		}
	}, [maxFileSizeBytes]);

	const onDrop = useCallback((accepted: File[]) => {
		if (accepted.length > 0) handleFile(accepted[0]);
	}, [handleFile]);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { 'image/tiff': ['.tif', '.tiff'] },
		multiple: false,
	});

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) handleFile(f);
	};

	const handleClear = () => {
		setFile(null);
		setMetadata(null);
		setFileSizeError(false);
		setDx('');
		setDy('');
		setDz('');
		setRadiusUm('');
		setSubmitAttempted(false);
	};

	const handleSubmit = async () => {
		setSubmitAttempted(true);
		if (!file || fileSizeError || !radiusUm || !dx || !dy || !dz) return;

		const parsedDx = parseFloat(dx);
		const parsedDy = parseFloat(dy);
		const parsedDz = parseFloat(dz);
		const parsedRadius = parseFloat(radiusUm);

		if (isNaN(parsedDx) || parsedDx <= 0 || isNaN(parsedDy) || parsedDy <= 0 || isNaN(parsedDz) || parsedDz <= 0) return;
		if (isNaN(parsedRadius) || parsedRadius <= 0) return;

		setIsSubmitting(true);
		try {
			const job: SegmentationJob = {
				tifFile: file,
				fluorescentLabel,
				radiusUm: parsedRadius,
				dx: parsedDx,
				dy: parsedDy,
				dz: parsedDz,
			};
			await onSubmit(job);
		} finally {
			setIsSubmitting(false);
		}
	};

	const hasChannelError = metadata != null && metadata.channels !== 1;
	const missingDimensions = !dx || !dy || !dz;
	const canSubmit = file && !fileSizeError && radiusUm && dx && dy && dz && !isExtracting && !isSubmitting && !hasChannelError;

	// Helpers for the metadata summary
	const dxFromMeta = metadata?.dx != null;
	const dyFromMeta = metadata?.dy != null;
	const dzFromMeta = metadata?.dz != null;
	const allDimsFromMeta = dxFromMeta && dyFromMeta && dzFromMeta;
	const noDimsFromMeta = !dxFromMeta && !dyFromMeta && !dzFromMeta;
	const missingFromMeta = [
		...(!dxFromMeta ? ['dx'] : []),
		...(!dyFromMeta ? ['dy'] : []),
		...(!dzFromMeta ? ['dz'] : []),
	];

	return (
		<div className="space-y-6">
			{/* ── Step 1: File Upload ── */}
			{!file ? (
				<div className="space-y-4">
					{/* Requirements info box */}
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<div className="text-sm text-gray-600 space-y-2">
							<p className="font-medium text-gray-700">Image requirements</p>
							<ul className="list-disc list-inside space-y-1 text-gray-500">
								<li><strong>Format:</strong> .tif or .tiff (3D image stack with multiple z-slices)</li>
								<li><strong>Channels:</strong> single-channel only</li>
								<li><strong>Binarization:</strong> image should be binarized (black & white) — if not, the server will attempt to verify</li>
								<li><strong>Max file size:</strong> {maxFileSizeMb} MB</li>
							</ul>
							<p className="text-gray-400 text-xs pt-1">
								Voxel dimensions (dx, dy, dz) will be read from the file metadata when available. If any values are missing, you will be prompted to enter them manually.
							</p>
						</div>
					</div>

					{/* Dropzone */}
					<div
						{...getRootProps()}
						className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
							isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
						}`}
					>
						<input {...getInputProps()} />
						<p className="text-gray-500">
							Drag & drop a <strong>.tif</strong> file here, or click to select
						</p>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept=".tif,.tiff"
						onChange={handleFileInput}
						className="hidden"
					/>
				</div>
			) : (
				<div className="space-y-6">
					{/* ── File header ── */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="font-medium text-gray-700">{file.name}</span>
							<span className={`text-xs ${fileSizeError ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
								({(file.size / (1024 * 1024)).toFixed(1)} MB)
							</span>
						</div>
						<button
							type="button"
							className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
							onClick={handleClear}
							disabled={isSubmitting}
						>
							<FaTimes className="w-3 h-3" /> Change file
						</button>
					</div>

					{/* ── File too large error ── */}
					{fileSizeError && (
						<div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-2.5 items-start">
							<FaExclamationTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
							<div className="text-sm text-red-700 space-y-1">
								<p className="font-medium">File too large</p>
								<p>
									This file is {(file.size / (1024 * 1024)).toFixed(0)} MB, which exceeds
									the server limit of {maxFileSizeMb} MB. You can try compressing the TIF
									(e.g. LZW compression in ImageJ/Fiji), cropping the volume, or
									downsampling to reduce the file size.
								</p>
							</div>
						</div>
					)}

					{/* ── Extracting spinner ── */}
					{isExtracting && (
						<div className="flex items-center gap-2 text-sm text-gray-500 py-4">
							<FaSpinner className="animate-spin" /> Reading file metadata...
						</div>
					)}

					{/* ── Step 2: Metadata summary ── */}
					{metadata && !isExtracting && !fileSizeError && (
						<div className="space-y-6">
							{/* File checks */}
							<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
								<div className="text-sm font-medium text-gray-700">File Checks</div>
								<div className="flex flex-wrap gap-2">
									<span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
										metadata.channels === 1
											? 'bg-green-100 text-green-700'
											: 'bg-red-100 text-red-700'
									}`}>
										{metadata.channels === 1
											? <><FaCheckCircle /> Single-channel</>
											: <><FaExclamationTriangle /> {metadata.channels} channels — must be 1</>
										}
									</span>
									<span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
										metadata.isBinary
											? 'bg-green-100 text-green-700'
											: 'bg-yellow-100 text-yellow-700'
									}`}>
										{metadata.isBinary
											? <><FaCheckCircle /> Binarized</>
											: <><FaExclamationTriangle /> Binarization unconfirmed — will be verified on submission</>
										}
									</span>
								</div>

								{metadata.channels !== 1 && (
									<div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2.5">
										This file has {metadata.channels} channels. Particle segmentation requires a single-channel binarized image. Please preprocess your image and try again.
									</div>
								)}
							</div>

							{/* Voxel dimensions summary */}
							<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
								<div className="text-sm font-medium text-gray-700">Voxel Dimensions</div>

								{allDimsFromMeta && (
									<div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 items-start">
										<FaCheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
										<span>All voxel dimensions were successfully extracted from the file metadata. Please confirm the values below are correct.</span>
									</div>
								)}

								{!allDimsFromMeta && !noDimsFromMeta && (
									<div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-start">
										<FaExclamationTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
										<span>
											<strong>{missingFromMeta.join(', ')}</strong> could not be extracted from the file metadata.
											{' '}Please enter {missingFromMeta.length === 1 ? 'this value' : 'these values'} manually.
										</span>
									</div>
								)}

								{noDimsFromMeta && (
									<div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-start">
										<FaExclamationTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
										<span>
											No voxel dimensions could be extracted from the file metadata. Please enter dx, dy, and dz manually.
										</span>
									</div>
								)}

								{/* Per-dimension status + input */}
								{submitAttempted && missingDimensions && (
									<div className="text-sm text-red-600">
										All three voxel dimensions are required to run segmentation.
									</div>
								)}
								<div className="grid grid-cols-3 gap-4">
									{([
										{ key: 'dx', label: 'dx (pixel width)', value: dx, setter: setDx, fromMeta: dxFromMeta, placeholder: 'e.g. 0.5' },
										{ key: 'dy', label: 'dy (pixel height)', value: dy, setter: setDy, fromMeta: dyFromMeta, placeholder: 'e.g. 0.5' },
										{ key: 'dz', label: 'dz (z-spacing)', value: dz, setter: setDz, fromMeta: dzFromMeta, placeholder: 'e.g. 1.0' },
									] as const).map(({ key, label, value, setter, fromMeta, placeholder }) => (
										<div key={key}>
											<label className="block text-xs text-gray-500 mb-1">
												{label} <span className="text-red-500">*</span>
											</label>
											<input
												type="number"
												step="any"
												value={value}
												onChange={(e) => setter(e.target.value)}
												className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
													submitAttempted && !value
														? 'border-red-400 bg-red-50/30'
														: !value
															? 'border-amber-300 bg-amber-50/30'
															: 'border-gray-300'
												}`}
												placeholder={placeholder}
											/>
											<span className={`block text-[11px] mt-1 ${fromMeta ? 'text-green-600' : 'text-amber-600'}`}>
												{fromMeta ? 'From metadata' : 'Manual entry required'}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* ── Step 3: Segmentation parameters ── */}
							<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
								<div className="text-sm font-medium text-gray-700">Segmentation Parameters</div>

								{/* Fluorescent label */}
								<div>
									<label className="block text-xs text-gray-500 mb-2">
										Fluorescent label — are particles the bright (white) regions in the binarized image?
									</label>
									<div className="flex gap-3">
										<label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors text-sm ${
											fluorescentLabel === 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
										}`}>
											<input
												type="radio"
												name="fluorescentLabel"
												value={1}
												checked={fluorescentLabel === 1}
												onChange={() => setFluorescentLabel(1)}
												className="text-blue-600"
											/>
											Yes, particles are white (1)
										</label>
										<label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors text-sm ${
											fluorescentLabel === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
										}`}>
											<input
												type="radio"
												name="fluorescentLabel"
												value={0}
												checked={fluorescentLabel === 0}
												onChange={() => setFluorescentLabel(0)}
												className="text-blue-600"
											/>
											No, void space is white (0)
										</label>
									</div>
								</div>

								{/* Radius */}
								<div>
									<label className="block text-xs text-gray-500 mb-1">
										Approximate particle radius (µm) <span className="text-red-500">*</span>
									</label>
									<p className="text-[11px] text-gray-400 mb-1.5">
										An estimate is fine — this guides the watershed algorithm's seed detection, not the final segmentation boundaries.
									</p>
									<input
										type="number"
										step="any"
										min="0"
										value={radiusUm}
										onChange={(e) => setRadiusUm(e.target.value)}
										className={`w-48 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
											submitAttempted && !radiusUm ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
										}`}
										placeholder="e.g. 50"
									/>
								</div>
							</div>

							{/* ── Submit ── */}
							<div>
								<button
									type="button"
									onClick={handleSubmit}
									disabled={!canSubmit && submitAttempted}
									className="button-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{isSubmitting && <FaSpinner className="animate-spin" />}
									{isSubmitting ? 'Submitting...' : 'Submit Segmentation Job'}
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SegmentationJobForm;
