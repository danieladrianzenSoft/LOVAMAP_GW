import React from "react";
import Plot from "react-plotly.js";
import PlotlyLoader from "../../app/helpers/PlotlyLoader";
import { getPlotColor } from "../../app/utils/plot-colors";

interface HistogramPlotProps {
	data: number[] | number[][];
	title?: string;
	xlabel?: string;
	ylabel?: string;
	colors?: string[];
	interactive?: boolean;
	hideYLabels?: boolean; 
	horizontalYLabel?: boolean;
	titleFontSize?: number;
	labelFontSize?: number;
	tickFontSize?: number;
	tickDecimalPlaces?: number;
	showHoverInfo?: boolean;
	isNormalized?: boolean;
	showGrid?: boolean;
	useLogScale?: boolean;
}

export const HistogramPlot: React.FC<HistogramPlotProps> = ({ 
		data, title, xlabel, ylabel, horizontalYLabel,
		colors, interactive, hideYLabels, showHoverInfo,
		titleFontSize, labelFontSize, tickFontSize,
		tickDecimalPlaces, isNormalized, showGrid, useLogScale
	}) => {
	
	const seriesArray: number[][] = Array.isArray(data[0])
		? (data as number[][])
		: [data as number[]];

	const allValues = seriesArray.flat();
	const rawMin = Math.min(...allValues);
	const rawMax = Math.max(...allValues);

	const min = useLogScale ? Math.max(rawMin, 0.001) : rawMin;
	const max = rawMax;

	const median = allValues.sort((a, b) => a - b)[Math.floor(allValues.length / 2)];
	const mean = allValues.reduce((sum, x) => sum + x, 0) / allValues.length;
	const std = Math.sqrt(allValues.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / allValues.length);

	const xMin = useLogScale
		? Math.pow(10, Math.floor(Math.log10(min)))
		: Math.floor(min / 5) * 5 - 10 < 0 ? 0 : Math.floor(min / 5) * 5 - 10;

		const xMax = useLogScale
		? Math.pow(10, Math.ceil(Math.log10(max)))
		: Math.ceil(max / 5) * 5 + 10;

	const minBinSize = 1;
	const isClustered = std < 0.05 * Math.abs(median);

	const plotColors = colors && colors.length >= seriesArray.length
		? colors
		: seriesArray.map((_, i) => getPlotColor(i, seriesArray.length));
	const shouldShowGrid = showGrid ?? false;

	const plotData = seriesArray.map((series, i) => ({
		type: "histogram",
		x: series,
		opacity: 0.8,
		name: `Group ${i + 1}`,
		marker: {
			color: plotColors[i],
		},
		hoverinfo: showHoverInfo === false ? "skip" : undefined,
		histnorm: isNormalized ? "percent" : undefined,
		...(isClustered && {
			xbins: { size: minBinSize },
		}),
		}));

	return (
		<Plot
		data={plotData}
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
				type: useLogScale ? 'log' : 'linear',
				tickfont: { size: tickFontSize || 12 },
				tickvals: [xMin, median, xMax],
				ticktext: [xMin.toFixed(tickDecimalPlaces || 0), median.toFixed(tickDecimalPlaces || 0), xMax.toFixed(tickDecimalPlaces || 0)],
				range: [xMin, xMax],
				automargin: true,
				showgrid: shouldShowGrid,
			},
			yaxis: { 
				title: horizontalYLabel
					? undefined
					: {
						text: ylabel || "",
						font: {
							size: labelFontSize || 14,
							color: "#4B5563",
						},
						},
				tickfont: { size: tickFontSize || 12 },
				showticklabels: !hideYLabels,
				showgrid: shouldShowGrid,
			},
			annotations: horizontalYLabel && ylabel
				? [
					{
					text: ylabel,
					xref: "paper",
					yref: "paper",
					x: -0.12, // adjust based on spacing
					y: 0.5,
					showarrow: false,
					textangle: 0,
					font: {
						size: labelFontSize || 14,
						color: "#4B5563",
					},
					align: "center",
					},
				]
				: [],
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
		// Pass Plotly instance
		useResizeHandler
		revision={`${data.length}-${useLogScale}-${data.length}`} // re-render if data changes
		plotly={PlotlyLoader}
		/>
	);
};
