import React from "react";
import Plot from "react-plotly.js";
import PlotlyLoader from "../../app/helpers/PlotlyLoader";

interface HistogramPlotProps {
  data: number[];
  title?: string;
  xlabel?: string;
  ylabel?: string;
  color?: string;
  interactive?: boolean;
  hideYLabels?: boolean; 
}

export const HistogramPlot: React.FC<HistogramPlotProps> = ({ data, title, xlabel, ylabel, color, interactive, hideYLabels }) => {
	const min = Math.min(...data);
	const max = Math.max(...data);
	const median = data.sort((a, b) => a - b)[Math.floor(data.length / 2)];
	const defaultColor = "rgba(220, 220, 220, 0.8)"; // light grey
	const plotColor = color || defaultColor;

	return (
		<Plot
		data={[
			{
			type: "histogram",
			x: data,
			marker: {
				color: plotColor,
			},
			},
		]}
		layout={{
			autosize: true,
			title: { text: title || ""} ,
			xaxis: {
				title: { text: ylabel || "" },
				tickvals: [min, median, max],
				ticktext: [min.toFixed(2), median.toFixed(2), max.toFixed(2)],
			},
			yaxis: { 
				title: { text: xlabel || "" },
				showticklabels: !hideYLabels,
			},
			bargap: 0.05,
			margin: { t: 40, r: 20, l: 50, b: 50 },
		}}
		config={{
			responsive: true,
			displayModeBar: interactive,
			scrollZoom: false,
			displaylogo: false,
			modeBarButtonsToRemove: interactive
			? [] // show everything
			: ["zoom2d", "pan2d", "select2d", "lasso2d", "zoomIn2d", "zoomOut2d", "autoScale2d", "resetScale2d"],
		}}
		style={{ width: "100%", height: "100%" }}
		// 👇 Pass Plotly instance
		useResizeHandler
		revision={data.length} // re-render if data changes
		plotly={PlotlyLoader}
		/>
	);
};
