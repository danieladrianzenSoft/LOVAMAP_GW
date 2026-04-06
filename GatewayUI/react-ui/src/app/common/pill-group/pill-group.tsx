import React from "react";

export interface PillOption {
	key: string;
	label: string;
	itemClassName?: string;
}

interface PillGroupProps {
	options: PillOption[];
	selectedKey: string;
	onChange: (key: string) => void;
	className?: string;
}

const PillGroup: React.FC<PillGroupProps> = ({ options, selectedKey, onChange, className = "" }) => {
	return (
		<div className={`flex flex-wrap gap-2 ${className}`}>
			{options.map((option) => (
				<button
					key={option.key}
					onClick={() => onChange(option.key)}
					className={`px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${
						selectedKey === option.key
							? "bg-link-100 text-white"
							: "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
					} ${option.itemClassName ?? ""}`}
				>
					{option.label}
				</button>
			))}
		</div>
	);
};

export default PillGroup;
