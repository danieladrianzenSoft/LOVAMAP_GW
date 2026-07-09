import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface TtlDropZoneProps {
	onTtlLoaded: (content: string, fileName: string) => void;
}

const TtlDropZone: React.FC<TtlDropZoneProps> = ({ onTtlLoaded }) => {
	const onDrop = useCallback((acceptedFiles: File[]) => {
		for (const file of acceptedFiles) {
			const reader = new FileReader();
			reader.onload = () => {
				if (typeof reader.result === 'string') {
					onTtlLoaded(reader.result, file.name);
				}
			};
			reader.readAsText(file);
		}
	}, [onTtlLoaded]);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { 'text/turtle': ['.ttl'] },
		multiple: true,
	});

	return (
		<div
			{...getRootProps()}
			className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
				${isDragActive
					? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
					: 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
				}`}
		>
			<input {...getInputProps()} />
			<p className="text-sm text-gray-600 dark:text-gray-400">
				{isDragActive
					? 'Drop .ttl files here...'
					: 'Drag & drop .ttl files here, or click to browse'}
			</p>
			<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
				Supports multiple files — all will be parsed together
			</p>
		</div>
	);
};

export default TtlDropZone;
