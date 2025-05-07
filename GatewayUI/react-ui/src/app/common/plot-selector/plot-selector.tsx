import { useState } from 'react';

export interface PlotOption {
	key: string;
	label: string;
	component: React.ReactNode;
}

interface PlotSelectorProps {
	plots: PlotOption[];
	initialKey?: string;
	heightClass?: string; // Optional, e.g., "h-48"
}

const PlotSelector: React.FC<PlotSelectorProps> = ({ plots, initialKey, heightClass = 'h-48' }) => {
	const [selectedKey, setSelectedKey] = useState(initialKey ?? plots[0]?.key);

	const selectedPlot = plots.find(p => p.key === selectedKey);

	return (
		<div className="w-full mb-4">
			{/* Toggle Controls */}
			<div className="flex space-x-2 mt-8 mb-0">
				{plots.map((plot) => (
					<button
						key={plot.key}
						onClick={() => setSelectedKey(plot.key)}
						className={`px-2 py-1 rounded-full text-xs font-semibold border ${
							selectedKey === plot.key
								? 'bg-blue-600 text-white'
								: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
						}`}
					>
						{plot.label}
					</button>
				))}
			</div>

			{/* Plot */}
			<div className={`w-full ${heightClass}`}>
				{selectedPlot?.component ?? <div className="text-gray-400">No plot available</div>}
			</div>
		</div>
	);
};

export default PlotSelector;