import React, { useCallback, useRef, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { Accept, useDropzone } from 'react-dropzone';
import { observer } from 'mobx-react-lite';

interface UploadFileProps {
	acceptedFileTypes: Accept;
	onUploadSubmit: (files: File[], combinedJson?: any, imageType?: string) => Promise<void>;
	onUploadSuccess?: (response: any) => void;
	onUploadError?: (error: any) => void;
	isUploadDisabled?: boolean;
	uploadButtonLabel?: string;
	extraData?: Record<string, any>;
}

const UploadFile: React.FC<UploadFileProps> = ({ acceptedFileTypes, onUploadSubmit, onUploadError, isUploadDisabled, uploadButtonLabel = "Upload File", extraData }) => {
	const [files, setFiles] = useState<File[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const validFiles = acceptedFiles.filter(file =>
			Object.entries(acceptedFileTypes).some(([mimeType, extensions]) =>
				file.type === mimeType || extensions.some(ext => file.name.endsWith(ext))
			)
		);
	
		if (validFiles.length !== acceptedFiles.length) {
			alert('Some files were not of the accepted file type and were not added.');
		}
		setFiles(prevFiles => [...prevFiles, ...validFiles]);
	}, [acceptedFileTypes]);
	
	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(event.target.files || []);
		const validFiles = selectedFiles.filter(file =>
			Object.entries(acceptedFileTypes).some(([mimeType, extensions]) =>
				file.type === mimeType || extensions.some(ext => file.name.endsWith(ext))
			)
		);
	
		if (validFiles.length !== selectedFiles.length) {
			alert('Some files were not of the accepted file type and were not added.');
		}
		setFiles(prevFiles => [...prevFiles, ...validFiles]);
	};

	const handleFileUpload = async () => {
		if (files.length === 0) {
		  alert('No files selected.');
		  return;
		}
	
		setIsLoading(true);
	
		try {
			await onUploadSubmit(files);
		} catch (error) {
			if (onUploadError) onUploadError(error instanceof Error ? error.message : 'Failed to upload files.');
			console.error(error);
		} finally {
			setIsLoading(false);
			setFiles([]);
		}
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: acceptedFileTypes,
		multiple: true
	});

  return (
    <div className="p-4 w-full">
		<div className='w-full flex flex-col sm:flex-row justify-between items-between sm:justify-between sm:items-center gap-4 mb-4'>
			<label className="block">
				<input
					type="file"
					accept={Object.entries(acceptedFileTypes)
						.flatMap(([mimeType, extensions]) => [mimeType, ...extensions])
						.join(',')}
					onChange={handleFileChange}
					multiple
					className="hidden"
					ref={fileInputRef}
				/>
				<div className="flex items-center">
					<button
						type="button"
						className="default-upload-button flex-grow-0 flex-shrink-0"
						onClick={() => fileInputRef.current?.click()}
						>
						Select Files
					</button>
					<span className="ml-2">{files.length > 0 ? files.length === 1 ? '1 file selected' : files.length + ' files selected' : 'No files chosen'}</span>
				</div>
			</label>
			<button
				type="button"
				onClick={handleFileUpload}
				className="button-outline flex items-center justify-center space-x-2"
				disabled={isLoading || isUploadDisabled} // Disable button when loading
			>
				{uploadButtonLabel ?? "Upload File"}
				{isLoading && (
					<FaSpinner className="animate-spin ml-2" size={20} />
				)}
			</button>
		</div>
		<div
			{...getRootProps()}
			className={`border-2 border-dashed p-4 mb-4 w-full cursor-pointer flex justify-center items-center ${
          isDragActive ? 'border-blue-500' : 'border-gray-300'}`}
		>
			<input {...getInputProps()} className="hidden" />
			<p>Drag & drop a file here, or click to select a file</p>
		</div>
		<div className="mt-2">
        {files.length > 0 && (
          <ul>
            {files.map((file, index) => (
              <li key={index} className="text-sm text-gray-600">
                {file.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default observer(UploadFile);