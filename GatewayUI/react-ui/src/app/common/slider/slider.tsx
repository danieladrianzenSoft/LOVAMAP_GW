import React, { useState, useEffect } from 'react';

interface SliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (newValue: number) => void;
}

const Slider: React.FC<SliderProps> = ({
  label = '',
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
}) => {
	const [inputValue, setInputValue] = useState(value.toFixed(2));

	useEffect(() => {
		setInputValue(value.toFixed(2));
	}, [value]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
	};

	const commitInputValue = () => {
		const parsed = parseFloat(inputValue);
		if (!isNaN(parsed)) {
			const clamped = Math.min(max, Math.max(min, parsed));
			onChange(clamped);
			setInputValue(clamped.toFixed(2));
		} else {
			setInputValue(value.toFixed(2));
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			commitInputValue();
			(e.target as HTMLInputElement).blur();
		}
	};

	return (
		<div className="flex flex-col gap-1 w-full mb-3 mt-3">
		<div className="flex items-center justify-between text-sm text-gray-700">
			<span>{label}</span>
			<input
				type="text"
				value={inputValue}
				onChange={handleInputChange}
				onBlur={commitInputValue}
				onKeyDown={handleKeyDown}
				className="w-14 text-right px-1 py-0.5 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-link-100"
			/>
		</div>
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			onChange={(e) => onChange(parseFloat(e.target.value))}
			className="custom-slider w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-link-100"
		/>
		</div>
	);
};

export default Slider;