interface AcknowledgementModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

const AcknowledgementModal: React.FC<AcknowledgementModalProps> = ({
	isOpen,
	onClose,
	onConfirm
}) => {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded-lg shadow-lg max-w-xl w-full">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-gray-800">Cite us</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
					>
						&times;
					</button>
				</div>

				<div className="text-sm text-gray-600 mb-4 leading-relaxed">
					We're glad you're using LOVAMAP and its associated data. If you include this data in your work, please cite the following publication:

					<br /><br />
					<strong>
						Riley, L., Cheng, P., & Segura, T. <i>Identification and analysis of 3D pores in packed particulate materials.</i> Nat Comput Sci <b>3</b>, 975-992 (2023). https://doi.org/10.1038/s43588-023-00551-x
					</strong>
					<br /><br />
					Additionally, we kindly ask that you acknowledge Duke University's Materials in Medicine Center in your manuscript.

					<br /><br />
					Thank you for supporting open science.
				</div>

				<div className="flex justify-end space-x-2 mt-4">
					<button
						onClick={onClose}
						className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
					>
						Continue to Download
					</button>
				</div>

			</div>
		</div>
	);
};
export default AcknowledgementModal;