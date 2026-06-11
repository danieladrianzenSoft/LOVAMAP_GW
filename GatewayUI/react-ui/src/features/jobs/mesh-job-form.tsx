import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaSpinner } from 'react-icons/fa';
import { MeshJob } from '../../app/models/job';

interface Props {
	onSubmit: (job: MeshJob) => Promise<void>;
}

const MeshJobForm: React.FC<Props> = ({ onSubmit }) => {
	const [file, setFile] = useState<File | null>(null);
	const [meshWorkflow, setMeshWorkflow] = useState<'mesh_generation' | 'unite_meshes'>('mesh_generation');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const onDrop = useCallback((accepted: File[]) => {
		if (accepted.length > 0) setFile(accepted[0]);
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'application/json': ['.json'],
			'text/csv': ['.csv'],
			'application/octet-stream': ['.dat'],
		},
		multiple: false,
	});

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) setFile(f);
	};

	const handleClear = () => {
		setFile(null);
	};

	const handleSubmit = async () => {
		if (!file) return;
		setIsSubmitting(true);
		try {
			await onSubmit({ file, meshWorkflow });
		} finally {
			setIsSubmitting(false);
		}
	};

	const canSubmit = file && !isSubmitting;

	return (
		<div>
			{/* File Upload */}
			{!file ? (
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Upload data file
					</label>
					<div
						{...getRootProps()}
						className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
							isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
						}`}
					>
						<input {...getInputProps()} />
						<p className="text-gray-500">
							Drag & drop a <strong>.json</strong> or <strong>.dat</strong> file here, or click to select
						</p>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept=".json,.csv,.dat"
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

					<div className="space-y-4">
						{/* Workflow selection */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Mesh Workflow
							</label>
							<div className="flex gap-4">
								<label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
									meshWorkflow === 'mesh_generation' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
								}`}>
									<input
										type="radio"
										name="meshWorkflow"
										value="mesh_generation"
										checked={meshWorkflow === 'mesh_generation'}
										onChange={() => setMeshWorkflow('mesh_generation')}
										className="text-blue-600"
									/>
									<span className="text-sm">Generate Meshes</span>
								</label>
								<label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
									meshWorkflow === 'unite_meshes' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
								}`}>
									<input
										type="radio"
										name="meshWorkflow"
										value="unite_meshes"
										checked={meshWorkflow === 'unite_meshes'}
										onChange={() => setMeshWorkflow('unite_meshes')}
										className="text-blue-600"
									/>
									<span className="text-sm">Unite Meshes</span>
								</label>
							</div>
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
								{isSubmitting ? 'Submitting...' : 'Submit Mesh Job'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default MeshJobForm;
