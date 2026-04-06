import { useEffect, useState } from 'react';
import PillGroup from '../pill-group/pill-group';

export interface PlotOption {
	key: string;
	label: string;
	component: React.ReactNode;
	onClick?: () => void;
	itemClassName?: string;
}

interface PlotSelectorProps {
	plots: PlotOption[];
	initialKey?: string;
	heightClass?: string; // Optional, e.g., "h-48"
}

const PlotSelector: React.FC<PlotSelectorProps> = ({ plots, initialKey, heightClass = 'h-48' }) => {
	const [selectedKey, setSelectedKey] = useState(initialKey ?? plots[0]?.key);

	useEffect(() => {
		// Reset selection when plots or initialKey changes
		if (!selectedKey || !plots.find(p => p.key === selectedKey)) {
			setSelectedKey(initialKey ?? plots[0]?.key);
		}
	}, [plots, initialKey, selectedKey]);

	const selectedPlot = plots.find(p => p.key === selectedKey);

	const handleChange = (key: string) => {
		const plot = plots.find(p => p.key === key);
		if (plot?.onClick) {
			plot.onClick();
		} else {
			setSelectedKey(key);
		}
	};

	return (
		<div className="w-full mb-4">
			{/* Toggle Controls */}
			<PillGroup
				options={plots.map(p => ({ key: p.key, label: p.label, itemClassName: p.itemClassName }))}
				selectedKey={selectedKey}
				onChange={handleChange}
				className="mt-8 mb-0"
			/>

			{/* Plot */}
			<div className={`w-full ${heightClass}`}>
				{selectedPlot?.component ?? <div className="text-gray-400 p-2">No plot available</div>}
			</div>
		</div>
	);
};

export default PlotSelector;
