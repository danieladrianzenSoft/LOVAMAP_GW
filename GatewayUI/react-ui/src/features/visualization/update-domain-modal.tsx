import React, { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import UploadFile from "../../app/common/upload-file/upload-file";
import { Domain } from "../../app/models/domain";

interface UpdateDomainModalProps {
	isOpen: boolean;
	onClose: () => void;
	onFormSubmit: (
		e: React.FormEvent,
		payload: {
			category: number;
			voxelSize: number | null;
			domainSize: [number | null, number | null, number | null];
      		selectedFile?: File | null;
			metadataFile?: File | null;
		}
	) => void;
  	domain: Domain | null;
	isLoading: boolean;
}

const UpdateDomainModal: React.FC<UpdateDomainModalProps> = ({
	isOpen,
	onClose,
	onFormSubmit,
  	domain,
	isLoading,
}) => {
	const [showUploadField, setShowUploadField] = useState(domain == null);

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [metadataFile, setMetadataFile] = useState<File | null>(null);
	const [showMetadataField, setShowMetadataField] = useState(false);
	const [category, setCategory] = useState<number | null>(null);
	const [voxelSize, setVoxelSize] = useState<number | null>(null);
	const [domainSize, setDomainSize] = useState<[number | null, number | null, number | null]>([null, null, null]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen && domain) {
		if (domain.category != null) setCategory(domain.category);
		if (domain.voxelSize != null) setVoxelSize(domain.voxelSize);
		if (domain.domainSize) {
			// eslint-disable-next-line no-useless-escape
			const cleaned = domain.domainSize.replace(/[\[\]]/g, "");
			const parsed = cleaned.split(",").map(part => {
			const n = parseFloat(part.trim());
			return isNaN(n) ? null : n;
			});
			const padded = [...parsed, null, null, null].slice(0, 3) as [number | null, number | null, number | null];
			setDomainSize(padded);
		}
		}
	}, [isOpen, domain]);

	const handleClose = () => {
		setError(null);
		if (domain) {
		setShowUploadField(false);
		}
		setSelectedFile(null);
		onClose();
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!domain && !selectedFile) {
			setError("Mesh file is required when creating a new domain.");
			return;
		}

		if (category === null || category === undefined) {
			setError("Please select a valid category.");
			return;
		}

		setSelectedFile(null);
		setShowUploadField(false);

		onFormSubmit(e, {
			category,
			voxelSize,
			domainSize,
			selectedFile,
			metadataFile
		});
	};

	const handleFileSelect = async (files: File[]) => {
		if (files?.length === 0) return;
		setError(null);
		setSelectedFile(files[0]);
		setShowUploadField(false);
	}

	const handleMetadataSelect = async (files: File[]) => {
		if (files?.length === 0) return;
		setError(null);
		setMetadataFile(files[0]);
		setShowMetadataField(false);
	};

	const handleSizeChange = (index: number, value: string) => {
		const updated = [...domainSize] as [number | null, number | null, number | null];
		updated[index] = value ? parseFloat(value) : null;
		setDomainSize(updated);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold">Edit Domain</h2>
					<button onClick={handleClose} className="text-gray-500 hover:text-gray-700 cursor-pointer">
						&times;
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Category */}
					<div>
						<label className="block text-sm font-medium text-gray-700">Category *</label>
						<select
							value={category ?? ""}
							onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : null)}
							className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
							required
						>
							<option value="">Select Category</option>
							<option value={0}>Particle</option>
							<option value={1}>Pore</option>
							<option value={2}>Other</option>
						</select>
					</div>

					{/* Voxel Size */}
					<div>
						<label className="block text-sm font-medium text-gray-700">Voxel Size</label>
						<input
							type="number"
							step="any"
							placeholder="Enter voxel size (optional)"
							value={voxelSize ?? ""}
							onChange={(e) => setVoxelSize(e.target.value ? parseFloat(e.target.value) : null)}
							className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
						/>
					</div>

					{/* Domain Size */}
					<div>
						<label className="block text-sm font-medium text-gray-700">Domain Size (X, Y, Z)</label>
						<div className="flex space-x-2">
							{[0, 1, 2].map((index) => (
								<input
									key={index}
									type="number"
									step="any"
									placeholder={"XYZ"[index]}
									value={domainSize[index] ?? ""}
									onChange={(e) => handleSizeChange(index, e.target.value)}
									className="w-1/3 p-2 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
								/>
							))}
						</div>
					</div>

					{/* Mesh Upload */}
					<div className="pt-1">
						<div className="flex items-center justify-between">
							<label className="block text-sm font-medium text-gray-700">
								Mesh File {domain === null && <span>*</span>}
							</label>

							{/* Only show toggle button if editing an existing domain or updating a selected file*/}
							{(domain || (domain === null && selectedFile)) && (
								<button
									type="button"
									onClick={() => {
										setShowUploadField(!showUploadField);
										setShowMetadataField(false);
									}}
									className="text-sm text-blue-600 underline hover:text-blue-800"
								>
									{showUploadField ? "Cancel" : "Update Mesh"}
								</button>
							)}
						</div>

						{/* Existing file name info (only if editing) */}
						{domain && !showUploadField && !selectedFile &&
							<p className="text-sm text-gray-600 italic">
								{domain.originalFileName ?? "Uploaded mesh"}
							</p>
						}

						{/* Show the upload field: always for new domain, toggle for existing */}
						{selectedFile && (
						<p className="text-sm text-gray-600 mt-1">
							✔ File selected: {selectedFile.name}
						</p>
						)}
						{((domain === null && !selectedFile) || showUploadField) && (
						<>
							<UploadFile
								acceptedFileTypes={{ "model/gltf-binary": [".glb"] }}
								onUploadSubmit={handleFileSelect}
							/>
						</>
						)}
					</div>

					{/* Metadata Upload */}
					<div className="pt-3">
						<div className="flex items-center justify-between">
							<label className="block text-sm font-medium text-gray-700">
								Metadata File
							</label>

							{(domain || metadataFile) && (
								<button
									type="button"
									onClick={() => {
										setShowMetadataField(!showMetadataField);
										setShowUploadField(false);
									}}
									className="text-sm text-blue-600 underline hover:text-blue-800"
								>
									{showMetadataField ? "Cancel" : "Update Metadata"}
								</button>
							)}
						</div>

						{/* Show selected file info */}
						{metadataFile && (
							<p className="text-sm text-gray-600 mt-1">
								✔ File selected: {metadataFile.name}
							</p>
						)}

						{/* Upload input */}
						{showMetadataField && (
							<UploadFile
								acceptedFileTypes={{ "application/json": [".json"] }}
								onUploadSubmit={handleMetadataSelect}
							/>
						)}
					</div>

					{/* Error */}
					{error && <p className="text-red-500 text-sm mt-2">{error}</p>}

					{/* Submit */}
					<button
						type="submit"
						className={`w-full py-2 rounded-md transition ${
							isLoading
								? "bg-gray-400 cursor-not-allowed"
								: "bg-blue-600 text-white hover:bg-blue-700"
						}`}
					>
						{isLoading ? (
							<>
								<FaSpinner className="animate-spin mr-2 inline" /> Saving...
							</>
						) : (
							"Save Domain"
						)}
					</button>
				</form>
			</div>
		</div>
	);
};

export default UpdateDomainModal;