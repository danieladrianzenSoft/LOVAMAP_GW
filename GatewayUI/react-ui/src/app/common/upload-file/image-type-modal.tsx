import React, { useState } from 'react';

interface ImageTypeModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (imageType: string) => void;
}

const ImageTypeModal: React.FC<ImageTypeModalProps> = ({ isOpen, onClose, onSubmit }) => {
	const [imageType, setImageType] = useState<string | null>(null);

	const handleSubmit = () => {
		if (imageType) {
			onSubmit(imageType);
		} else {
			alert('Please select an image type.');
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
			<div className="bg-white p-6 rounded-lg shadow-lg">
				<h2 className="text-lg font-bold mb-4">Select Image Type</h2>
				<div className="flex space-x-4 mb-4">
					<button
						className={`button ${imageType === 'Scaffold' ? 'bg-blue-500' : 'bg-gray-200'}`}
						onClick={() => setImageType('Scaffold')}
					>
						Scaffold Image
					</button>
					<button
						className={`button ${imageType === 'Graph' ? 'bg-blue-500' : 'bg-gray-200'}`}
						onClick={() => setImageType('Graph')}
					>
						Graph Image
					</button>
				</div>
				<div className="flex justify-end space-x-2">
					<button className="button" onClick={onClose}>Cancel</button>
					<button className="button bg-blue-500" onClick={handleSubmit}>Submit</button>
				</div>
			</div>
		</div>
	);
};

export default ImageTypeModal;