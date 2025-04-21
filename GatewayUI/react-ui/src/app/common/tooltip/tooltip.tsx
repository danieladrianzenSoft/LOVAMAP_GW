import { FaInfoCircle } from "react-icons/fa";

interface TextTooltipProps {
	label: string;
	tooltipText: string;
}

const TextTooltip: React.FC<TextTooltipProps> = ({ label, tooltipText }) => {
	return (
		<div className="relative group inline-flex items-center space-x-1">
			<span>{label}</span>

			<div className="relative">
				<div className="ml-1 text-gray-400 cursor-pointer group-hover:text-gray-600">
					<FaInfoCircle />
				</div>

				{/* Tooltip bubble */}
				<div className="absolute left-4 top-full mt-1 w-64 p-2 bg-white border border-gray-300 rounded shadow-lg z-50 hidden group-hover:block text-sm text-gray-700">
					{tooltipText}
				</div>
			</div>
		</div>
	);
};

export default TextTooltip;