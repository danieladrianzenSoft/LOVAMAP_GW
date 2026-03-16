import React from "react";
import Plot from "react-plotly.js";
import PlotlyLoader from "../../app/helpers/PlotlyLoader";
import { PLOT_COLORS } from "../../app/utils/plot-colors";

interface BarChartProps {
	labels: string[];
	values: number[];
	title?: string;
	xlabel?: string;
	ylabel?: string;
	yMin?: number;
	darkMode?: boolean;
	onClick?: (label: string) => void;
}

export const BarChart: React.FC<BarChartProps> = ({
	labels, values, title, xlabel, ylabel, yMin, darkMode = false, onClick
}) => {
	const textColor = darkMode ? "#e5e7eb" : "#374151";
	const gridColor = darkMode ? "#374151" : "#e5e7eb";
	const bgColor = "rgba(0,0,0,0)";

	return (
		<Plot
			divId={`bar-${title?.replace(/\s/g, "-") ?? "chart"}`}
			data={[
				{
					type: "bar",
					x: labels,
					y: values,
					marker: {
						color: labels.map((_, i) => PLOT_COLORS[i % PLOT_COLORS.length]),
					},
					hoverinfo: "x+y",
					textposition: "auto",
				},
			]}
			layout={{
				title: title ? { text: title, font: { size: 14, color: textColor } } : undefined,
				paper_bgcolor: bgColor,
				plot_bgcolor: bgColor,
				margin: { t: title ? 40 : 20, b: 60, l: 50, r: 20 },
				autosize: true,
				xaxis: {
					title: xlabel ? { text: xlabel, font: { size: 12, color: textColor } } : undefined,
					tickfont: { size: 10, color: textColor },
					gridcolor: gridColor,
				},
				yaxis: {
					title: ylabel ? { text: ylabel, font: { size: 12, color: textColor } } : undefined,
					tickfont: { size: 10, color: textColor },
					gridcolor: gridColor,
					rangemode: yMin !== undefined ? "tozero" : undefined,
				},
			}}
			config={{ displayModeBar: false, responsive: true }}
			useResizeHandler
			style={{ width: "100%", height: "100%" }}
			onClick={(e: any) => {
				if (onClick && e.points?.[0]) {
					onClick(e.points[0].x as string);
				}
			}}
		/>
	);
};
