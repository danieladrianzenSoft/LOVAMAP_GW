export const PLOT_COLORS = [
	"rgba(200, 140, 140, 0.8)", // greyish red
	"rgba(204, 153, 255, 0.8)", // purple
	"rgba(150, 250, 150, 0.8)", // light green
	"rgba(140, 140, 250, 0.8)", // blue
	"#F97316", // orange
	"#F43F5E", // red-pink
	"#FACC15", // yellow
	"#EC4899", // pink
];

const DEFAULT_LIGHT_GREY = "rgba(220, 220, 220, 0.8)";
const DEFAULT_DARK_GREY = "rgba(160, 160, 160, 0.8)";

export const getPlotColor = (index: number, total: number): string => {
  if (total === 1) return DEFAULT_LIGHT_GREY;
  if (index === 0) return DEFAULT_DARK_GREY;
  return PLOT_COLORS[(index - 1) % PLOT_COLORS.length];
};