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
  titleFontSize?: number;
  labelFontSize?: number;
  tickFontSize?: number;
  tickDecimalPlaces?: number;
  showHoverInfo?: boolean;
}

export const HistogramPlot: React.FC<HistogramPlotProps> = ({ 
		data, title, xlabel, ylabel, 
		color, interactive, hideYLabels, showHoverInfo,
		titleFontSize, labelFontSize, tickFontSize,
		tickDecimalPlaces
	}) => {
	const min = Math.min(...data);
	const max = Math.max(...data);
	const median = data.sort((a, b) => a - b)[Math.floor(data.length / 2)];
	const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
	const std = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length);
	const roundedMin = Math.floor(min / 5) * 5;
	const roundedMax = Math.ceil(max / 5) * 5;
	const defaultColor = "rgba(220, 220, 220, 0.8)"; // light grey
	const plotColor = color || defaultColor;
	const xMin = roundedMin - 10 < 0 ? 0 : roundedMin - 10;
	const xMax = roundedMax + 10;
	const minBinSize = 1;
	const isClustered = std < 0.05 * Math.abs(median);
	return (
		<Plot
		data={[
			{
				type: "histogram",
				x: data,
				marker: {
					color: plotColor,
				},
				hoverinfo: showHoverInfo === false ? "skip" : undefined,
				...(isClustered && {
					xbins: {
					  size: minBinSize,
					},
				}),
			},
		]}
		layout={{
			autosize: true,
			hovermode: showHoverInfo === false ? false : "closest",
			dragmode: showHoverInfo === false ? false : "zoom", // or "pan"
			title: { 
				text: title || "" ,
				font: { 
					size: titleFontSize || 16 ,
					color: "#4B5563"
				},
			} ,
			xaxis: {
				title: { 
					text: xlabel || "" ,
					font: { 
						size: labelFontSize || 14 ,
						color: "#4B5563"
					},
				},
				tickfont: { size: tickFontSize || 12 },
				tickvals: [xMin, median, xMax],
				ticktext: [xMin.toFixed(tickDecimalPlaces || 0), median.toFixed(tickDecimalPlaces || 0), xMax.toFixed(tickDecimalPlaces || 0)],
				range: [xMin, xMax],
				automargin: true
			},
			yaxis: { 
				title: { 
					text: ylabel || "" ,
					font: { 
						size: labelFontSize || 14 ,
						color: "#4B5563"
					}, 
				},
				tickfont: { size: tickFontSize || 12 },
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
			staticPlot: showHoverInfo === false,
			modeBarButtonsToRemove: interactive
			? [] // show everything
			: ["zoom2d", "pan2d", "select2d", "lasso2d", "zoomIn2d", "zoomOut2d", "autoScale2d", "resetScale2d"],
		}}
		style={{ 
			width: "100%", 
			height: "100%",
			cursor: showHoverInfo === false ? "default" : undefined
		}}
		// 👇 Pass Plotly instance
		useResizeHandler
		revision={data.length} // re-render if data changes
		plotly={PlotlyLoader}
		/>
	);
};
