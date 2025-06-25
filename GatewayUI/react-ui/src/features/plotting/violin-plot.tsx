import React from "react";
import Plot from "react-plotly.js";
import PlotlyLoader from "../../app/helpers/PlotlyLoader";
import { getPlotColor } from "../../app/utils/plot-colors";

interface ViolinPlotProps {
	data: number[][]; // Multiple distributions, one per group
	title?: string;
	xlabel?: string;
	ylabel?: string;
	colors?: string[];
	ylim?: [number | null, number | null];
	interactive?: boolean;
	showHoverInfo?: boolean;
	titleFontSize?: number;
	labelFontSize?: number;
	tickFontSize?: number;
	horizontalYLabel?: boolean;
	showGrid?: boolean;
	hideTickLabels?: boolean;
	useLogScale?: boolean;
}

export const ViolinPlot: React.FC<ViolinPlotProps> = ({
  data,
  title,
  xlabel,
  ylabel,
  ylim,
  colors,
  interactive,
  showHoverInfo,
  titleFontSize,
  labelFontSize,
  tickFontSize,
  horizontalYLabel,
  showGrid,
  hideTickLabels,
  useLogScale
}) => {
	const plotColors = colors && colors.length >= data.length
		? colors
		: data.map((_, i) => getPlotColor(i, data.length));

	const shouldShowGrid = showGrid ?? false;

	const plotData = data.map((group, i) => ({
		type: "violin",
		y: group,
		name: `Group ${i + 1}`,
		box: { visible: true },
		meanline: { visible: true },
		line: { color: plotColors[i] },
		points: "none", // or "none", "all", "outliers", "suspectedoutliers"
		marker: { opacity: 0 },
		hoverinfo: showHoverInfo === false ? "skip" : undefined,
	}));

	return (
		<Plot
			data={plotData}
			layout={{
				autosize: true,
				title: {
				text: title || "",
				font: {
					size: titleFontSize || 16,
					color: "#4B5563",
				},
				},
				xaxis: {
					title: {
						text: xlabel || "",
						font: {
						size: labelFontSize || 14,
						color: "#4B5563",
						},
					},
					tickfont: { size: tickFontSize || 12 },
					showgrid: shouldShowGrid,
					showline: true,
					showticklabels: !hideTickLabels,
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
					type: useLogScale ? 'log' : 'linear',
					tickfont: { size: tickFontSize || 12 },
					range: ylim || [null, null],
					showgrid: shouldShowGrid,
					zeroline: false,
					mirror: false
				},
				annotations: horizontalYLabel && ylabel
				? [
					{
						text: ylabel,
						xref: "paper",
						yref: "paper",
						x: -0.12,
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
				margin: { t: 40, r: 20, l: 50, b: 50 },
				violingap: 0.4,
				violinmode: "group",
				hovermode: showHoverInfo === false ? false : "closest",
				dragmode: showHoverInfo === false ? false : "zoom",
				showlegend: true,
			}}
			config={{
				responsive: true,
				displayModeBar: interactive,
				scrollZoom: false,
				displaylogo: false,
				staticPlot: showHoverInfo === false,
				modeBarButtonsToRemove: interactive
				? []
				: [
					"zoom2d",
					"pan2d",
					"select2d",
					"lasso2d",
					"zoomIn2d",
					"zoomOut2d",
					"autoScale2d",
					"resetScale2d",
					],
			}}
			style={{
				width: "100%",
				height: "100%",
				cursor: showHoverInfo === false ? "default" : undefined,
			}}
			useResizeHandler
			// revision={data.reduce((sum, g) => sum + g.length, 0)} // update on data change
			revision={`${data.length}-${useLogScale}`}
			plotly={PlotlyLoader}
		/>
	);
};