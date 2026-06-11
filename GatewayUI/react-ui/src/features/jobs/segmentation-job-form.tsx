import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { extractTifMetadata, TifMetadata } from '../../app/helpers/tifMetadata';
import { SegmentationJob } from '../../app/models/job';

interface Props {
	onSubmit: (job: SegmentationJob) => Promise<void>;
}

const SegmentationJobForm: React.FC<Props> = ({ onSubmit }) => {
	const [file, setFile] = useState<File | null>(null);
	const [metadata, setMetadata] = useState<TifMetadata | null>(null);
	const [isExtracting, setIsExtracting] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Form fields
	const [dx, setDx] = useState<string>('');
	const [dy, setDy] = useState<string>('');
	const [dz, setDz] = useState<string>('');
	const [fluorescentLabel, setFluorescentLabel] = useState<number>(1);
	const [radiusUm, setRadiusUm] = useState<string>('');

	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(async (selectedFile: File) => {
		setFile(selectedFile);
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
	}, []);

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
		setDx('');
		setDy('');
		setDz('');
	};

	const handleSubmit = async () => {
		if (!file || !radiusUm) return;
		setIsSubmitting(true);
		try {
			const job: SegmentationJob = {
				tifFile: file,
				fluorescentLabel,
				radiusUm: parseFloat(radiusUm),
				dx: dx ? parseFloat(dx) : undefined,
				dy: dy ? parseFloat(dy) : undefined,
				dz: dz ? parseFloat(dz) : undefined,
			};
			await onSubmit(job);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Only multi-channel is a hard block; binarization is checked authoritatively server-side
	const hasChannelError = metadata != null && metadata.channels !== 1;
	const canSubmit = file && radiusUm && !isExtracting && !isSubmitting && !hasChannelError;

	return (
		<div>
			{/* File Upload */}
			{!file ? (
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Upload binarized .tif file
					</label>
					<div
						{...getRootProps()}
						className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
							isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
						}`}
					>
						<input {...getInputProps()} />
						<p className="text-gray-500">
							Drag & drop a <strong>.tif</strong> file here, or click to select
						</p>
						<p className="text-xs text-gray-400 mt-1">
							Must be single-channel, binarized
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
							className="text-sm text-blue-600 hover:underline"
							onClick={handleClear}
							disabled={isSubmitting}
						>
							Change file
						</button>
					</div>

					{/* Metadata extraction status */}
					{isExtracting && (
						<div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
							<FaSpinner className="animate-spin" /> Extracting metadata...
						</div>
					)}

					{metadata && !isExtracting && (
						<div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
							<div className="text-sm font-medium text-gray-700 mb-2">Extracted Metadata</div>

							{/* Validation badges */}
							<div className="flex gap-3 mb-3">
								<span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
									metadata.channels === 1
										? 'bg-green-100 text-green-700'
										: 'bg-red-100 text-red-700'
								}`}>
									{metadata.channels === 1
										? <><FaCheckCircle /> Single-channel</>
										: <><FaExclamationTriangle /> {metadata.channels} channels (must be 1)</>
									}
								</span>
								<span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
									metadata.isBinary
										? 'bg-green-100 text-green-700'
										: 'bg-yellow-100 text-yellow-700'
								}`}>
									{metadata.isBinary
										? <><FaCheckCircle /> Binarized</>
										: <><FaExclamationTriangle /> Binarization unconfirmed — will be checked on submission</>
									}
								</span>
							</div>

							{metadata.channels !== 1 && (
								<div className="text-sm text-red-600 bg-red-50 rounded p-2">
									This file has {metadata.channels} channels. Please provide a single-channel binarized image.
								</div>
							)}
						</div>
					)}

					{/* Resolution fields (editable, pre-filled from metadata) */}
					<div className="space-y-4">
						<div className="text-sm font-medium text-gray-700">
							Voxel Dimensions (µm)
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div>
								<label className="block text-xs text-gray-500 mb-1">dx (pixel width)</label>
								<input
									type="number"
									step="any"
									value={dx}
									onChange={(e) => setDx(e.target.value)}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="e.g. 0.5"
								/>
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">dy (pixel height)</label>
								<input
									type="number"
									step="any"
									value={dy}
									onChange={(e) => setDy(e.target.value)}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="e.g. 0.5"
								/>
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">dz (z-spacing)</label>
								<input
									type="number"
									step="any"
									value={dz}
									onChange={(e) => setDz(e.target.value)}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="e.g. 1.0"
								/>
							</div>
						</div>

						{/* Fluorescent label */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Fluorescent Label
							</label>
							<div className="flex gap-4">
								<label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
									fluorescentLabel === 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
								}`}>
									<input
										type="radio"
										name="fluorescentLabel"
										value={1}
										checked={fluorescentLabel === 1}
										onChange={() => setFluorescentLabel(1)}
										className="text-blue-600"
									/>
									<span className="text-sm">Particles are white (1)</span>
								</label>
								<label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
									fluorescentLabel === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
								}`}>
									<input
										type="radio"
										name="fluorescentLabel"
										value={0}
										checked={fluorescentLabel === 0}
										onChange={() => setFluorescentLabel(0)}
										className="text-blue-600"
									/>
									<span className="text-sm">Particles are black (0)</span>
								</label>
							</div>
						</div>

						{/* Radius */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Approximate Particle Radius (µm)
							</label>
							<input
								type="number"
								step="any"
								min="0"
								value={radiusUm}
								onChange={(e) => setRadiusUm(e.target.value)}
								className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="e.g. 50"
							/>
						</div>

						{/* Submit */}
						<div className="pt-4">
							<button
								type="button"
								onClick={handleSubmit}
								disabled={!canSubmit}
								className="button-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{isSubmitting && <FaSpinner className="animate-spin" />}
								{isSubmitting ? 'Submitting...' : 'Submit Segmentation Job'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default SegmentationJobForm;
