import React from "react";
import Plot from "react-plotly.js";
import PlotlyLoader from "../../app/helpers/PlotlyLoader";
import { PLOT_COLORS } from "../../app/utils/plot-colors";

interface AreaChartProps {
	labels: string[];
	values: number[];
	title?: string;
	xlabel?: string;
	ylabel?: string;
	yMin?: number;
	darkMode?: boolean;
}

export const AreaChart: React.FC<AreaChartProps> = ({
	labels, values, title, xlabel, ylabel, yMin, darkMode = false
}) => {
	const textColor = darkMode ? "#e5e7eb" : "#374151";
	const gridColor = darkMode ? "#374151" : "#e5e7eb";
	const bgColor = "rgba(0,0,0,0)";
	const lineColor = PLOT_COLORS[2];
	const fillColor = darkMode ? "rgba(140, 140, 250, 0.15)" : "rgba(140, 140, 250, 0.2)";

	return (
		<Plot
			divId={`area-${title?.replace(/\s/g, "-") ?? "chart"}`}
			data={[
				{
					type: "scatter",
					mode: "lines",
					x: labels,
					y: values,
					fill: "tozeroy",
					fillcolor: fillColor,
					line: { color: lineColor, width: 2, shape: "spline" },
					hoverinfo: "x+y",
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
		/>
	);
};
