import React from "react";

export interface PillOption {
	key: string;
	label: string;
}

interface PillGroupProps {
	options: PillOption[];
	selectedKey: string;
	onChange: (key: string) => void;
	className?: string;
}

const PillGroup: React.FC<PillGroupProps> = ({ options, selectedKey, onChange, className = "" }) => {
	return (
		<div className={`flex space-x-2 ${className}`}>
			{options.map((option) => (
				<button
					key={option.key}
					onClick={() => onChange(option.key)}
					className={`px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${
						selectedKey === option.key
							? "bg-blue-600 text-white border-blue-600"
							: "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
					}`}
				>
					{option.label}
				</button>
			))}
		</div>
	);
};

export default PillGroup;
