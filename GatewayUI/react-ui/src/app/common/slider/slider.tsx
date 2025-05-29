import React from 'react';

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
	return (
		<div className="flex flex-col gap-1 w-full mb-3 mt-3">
		<div className="text-sm text-gray-700">{label}: {value.toFixed(2)}</div>
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			onChange={(e) => onChange(parseFloat(e.target.value))}
			className="custom-slider w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
		/>
		</div>
	);
};

export default Slider;