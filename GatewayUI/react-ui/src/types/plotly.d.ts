declare module "plotly.js-basic-dist" {
	import * as Plotly from "plotly.js";
	export = Plotly;
}

declare module "react-plotly.js" {
	import { ComponentType } from "react";
	import { PlotParams } from "plotly.js";
	const Plot: ComponentType<PlotParams>;
	export default Plot;
}