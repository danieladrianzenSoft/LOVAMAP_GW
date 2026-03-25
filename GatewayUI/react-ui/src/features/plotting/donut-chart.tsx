import React from "react";
import Plot from "react-plotly.js";
import PlotlyLoader from "../../app/helpers/PlotlyLoader";
import { PLOT_COLORS } from "../../app/utils/plot-colors";

interface DonutChartProps {
	labels: string[];
	values: number[];
	title?: string;
	hole?: number;
	darkMode?: boolean;
	onSliceClick?: (label: string) => void;
}

export const DonutChart: React.FC<DonutChartProps> = ({
	labels, values, title, hole = 0.45, darkMode = false, onSliceClick
}) => {
	const textColor = darkMode ? "#e5e7eb" : "#374151";
	const bgColor = "rgba(0,0,0,0)";

	return (
		<Plot
			divId={`donut-${title?.replace(/\s/g, "-") ?? "chart"}`}
			data={[
				{
					type: "pie",
					labels,
					values,
					hole,
					marker: { colors: PLOT_COLORS },
					textinfo: "label+percent",
					textposition: "outside",
					textfont: { size: 11, color: textColor },
					hoverinfo: "label+value+percent",
					sort: false,
				},
			]}
			layout={{
				title: title ? { text: title, font: { size: 14, color: textColor } } : undefined,
				showlegend: false,
				paper_bgcolor: bgColor,
				plot_bgcolor: bgColor,
				margin: { t: title ? 40 : 10, b: 10, l: 10, r: 10 },
				autosize: true,
			}}
			config={{ displayModeBar: false, responsive: true }}
			useResizeHandler
			style={{ width: "100%", height: "100%" }}
			onClick={(e: any) => {
				if (onSliceClick && e.points?.[0]) {
					onSliceClick(e.points[0].label as string);
				}
			}}
		/>
	);
};
