import React, { useCallback, useRef, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { Accept, useDropzone } from 'react-dropzone';
import { observer } from 'mobx-react-lite';

interface UploadFileProps {
	acceptedFileTypes: Accept;
	onUploadSubmit: (files: File[], combinedJson?: any) => Promise<void>;
	onUploadSuccess?: (response: any) => void;
	onUploadError?: (error: any) => void;
}

const UploadFile: React.FC<UploadFileProps> = ({ acceptedFileTypes, onUploadSubmit, onUploadSuccess, onUploadError }) => {
	const [files, setFiles] = useState<File[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const validFiles = acceptedFiles.filter(file =>
		  Object.keys(acceptedFileTypes).some(type => file.type === type)
		);
		if (validFiles.length !== acceptedFiles.length) {
		  alert('Some files were not of the accepted file type and were not added.');
		}
		setFiles(prevFiles => [...prevFiles, ...validFiles]);
	  }, [acceptedFileTypes]);

	  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(event.target.files || []);
		const validFiles = selectedFiles.filter(file =>
		  Object.keys(acceptedFileTypes).some(type => file.type === type)
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
			if ('application/json' in acceptedFileTypes) {
				const jsonPromises = files.map(file => file.text().then(text => JSON.parse(text)));
				const jsonArray = await Promise.all(jsonPromises);
				const scaffoldsToCreate = jsonArray.reduce((acc, json) => acc.concat(json), []);
				await onUploadSubmit(files, scaffoldsToCreate);
			} else {
				await onUploadSubmit(files);
			}
	
		  if (onUploadSuccess) onUploadSuccess('Files uploaded successfully!');
		} catch (error) {
			if (onUploadError) onUploadError(error instanceof Error ? error.message : 'Failed to upload files.');
			//   alert('Failed to upload files.');
		  	console.error(error);
		} finally {
		  setIsLoading(false);
		  setFiles([]);
		}
	  };

	const { getRootProps, getInputProps } = useDropzone({
		onDrop,
		accept: acceptedFileTypes,
		multiple: true
	});


  return (
    <div className="p-4 w-full">
		<div className='w-full flex justify-between items-between mb-4'>
			<label className="block">
				<input
					type="file"
					accept={Object.keys(acceptedFileTypes).join(',')}
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
				onClick={handleFileUpload}
				className="button-outline"
				disabled={isLoading} // Disable button when loading
			>
				Upload File
				{isLoading && (
					<FaSpinner className="animate-spin ml-2" size={20} />
				)}
			</button>
		</div>
		<div
			{...getRootProps()}
			className="border-2 border-dashed border-gray-300 p-4 mb-4 w-full cursor-pointer flex justify-center items-center"
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