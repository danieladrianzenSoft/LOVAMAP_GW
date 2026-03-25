import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { CategoryCount } from "../../app/models/dashboardAnalytics";
import { DonutChart } from "../plotting/donut-chart";
import { BarChart } from "../plotting/bar-chart";
import { AreaChart } from "../plotting/area-chart";
import RdfVisualization from "../rdf-visualization/RdfVisualization";

type DataFilter = "all" | "simulated" | "real";
type TransferMode = "uploads" | "downloads";

const StatCard: React.FC<{ label: string; value: number | string; subtitle?: string }> = ({ label, value, subtitle }) => (
	<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center">
		<span className="text-2xl font-bold text-gray-800 dark:text-white">{value}</span>
		<span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</span>
		{subtitle && <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</span>}
	</div>
);

const ChartCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
	title, children, className = ""
}) => (
	<div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex flex-col ${className}`}>
		{title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>}
		<div className="flex-1 min-h-0">{children}</div>
	</div>
);

const Pill: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
	<button
		onClick={onClick}
		className={`px-3 py-1 text-xs rounded-full transition-colors ${
			active
				? "bg-blue-600 text-white"
				: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
		}`}
	>
		{label}
	</button>
);

function getFilteredValues(items: CategoryCount[], filter: DataFilter): number[] {
	switch (filter) {
		case "simulated": return items.map((c) => c.simulatedCount);
		case "real": return items.map((c) => c.realCount);
		default: return items.map((c) => c.count);
	}
}

const PACKING_KEY = "__packingConfiguration";

const Dashboard: React.FC = observer(() => {
	const { dashboardStore, commonStore } = useStore();
	const { analytics, loading, error, selectedCategory, selectedSlice } = dashboardStore;
	const darkMode = commonStore.darkMode;
	const [groupBy, setGroupBy] = useState("shape");
	const [dataFilter, setDataFilter] = useState<DataFilter>("all");
	const [transferMode, setTransferMode] = useState<TransferMode>("uploads");

	useEffect(() => {
		dashboardStore.loadDashboardAnalytics();
	}, [dashboardStore]);

	// Build the list of "group by" options from whatever the backend returns
	const groupByOptions = useMemo(() => {
		if (!analytics) return [];
		const tagKeys = Object.keys(analytics.tagDistributions);
		return [...tagKeys, PACKING_KEY];
	}, [analytics]);

	// Pick the right data for the current groupBy selection
	const chartData: CategoryCount[] = useMemo(() => {
		if (!analytics) return [];
		if (groupBy === PACKING_KEY) return analytics.packingConfigurationDistribution;
		return analytics.tagDistributions[groupBy] ?? [];
	}, [analytics, groupBy]);

	// Reset groupBy to first available option if the current one disappears
	useEffect(() => {
		if (groupByOptions.length > 0 && !groupByOptions.includes(groupBy)) {
			setGroupBy(groupByOptions[0]);
		}
	}, [groupByOptions, groupBy]);

	if (loading && !analytics) {
		return (
			<div className="container mx-auto py-8 px-2">
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
				</div>
			</div>
		);
	}

	if (error && !analytics) {
		return (
			<div className="container mx-auto py-8 px-2">
				<div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4">
					{error}
				</div>
			</div>
		);
	}

	if (!analytics) return null;

	const groupByLabel = (key: string) =>
		key === PACKING_KEY ? "Packing Configuration" : key.charAt(0).toUpperCase() + key.slice(1);

	return (
		<div className="container mx-auto py-8 px-2 space-y-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
				{/* <button
					onClick={() => dashboardStore.refreshAnalytics()}
					disabled={loading}
					className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
				>
					{loading ? "Refreshing..." : "Refresh"}
				</button> */}
			</div>

			{/* ── Relational Database section ── */}
			<section className="space-y-4">
				<h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Relational Database</h2>

				{/* Stat cards */}
				<div className="grid grid-cols-2 gap-4">
					<StatCard
						label="Scaffold Groups"
						value={analytics.totalScaffoldGroups}
						subtitle={`${analytics.simulatedGroupCount} simulated · ${analytics.realGroupCount} real`}
					/>
					<StatCard
						label="Scaffolds"
						value={analytics.totalScaffolds}
						subtitle={`${analytics.simulatedScaffoldCount} simulated · ${analytics.realScaffoldCount} real`}
					/>
				</div>

				{/* Data filter pills + charts */}
				<div className="space-y-2">
					<div className="flex items-center gap-1.5">
						<Pill label="All" active={dataFilter === "all"} onClick={() => setDataFilter("all")} />
						<Pill label="Simulated" active={dataFilter === "simulated"} onClick={() => setDataFilter("simulated")} />
						<Pill label="Real" active={dataFilter === "real"} onClick={() => setDataFilter("real")} />
					</div>

					{/* Distribution donut (left) + Particle size bar chart (right) */}
					<div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-[minmax(20rem,auto)] gap-4">
						<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex flex-col">
							<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
								<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Scaffold Groups by Category</h3>
								<div className="flex items-center gap-2">
									<label className="text-xs font-medium text-gray-500 dark:text-gray-400">Group by</label>
									<select
										value={groupBy}
										onChange={(e) => { setGroupBy(e.target.value); dashboardStore.clearDrillDown(); }}
										className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5
											bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"
									>
										{groupByOptions.map((key) => (
											<option key={key} value={key}>{groupByLabel(key)}</option>
										))}
									</select>
								</div>
							</div>
							<div className="flex-1 min-h-0">
								{chartData.length > 0 ? (
									<DonutChart
										labels={chartData.map((c) => c.name)}
										values={getFilteredValues(chartData, dataFilter)}
										darkMode={darkMode}
										onSliceClick={(label) => dashboardStore.setDrillDown(groupByLabel(groupBy), label)}
									/>
								) : (
									<div className="flex items-center justify-center h-full text-sm text-gray-400">
										No data for this grouping.
									</div>
								)}
							</div>
						</div>
						<ChartCard title="Particle Size Distribution">
							<BarChart
								labels={analytics.particleSizeBins.map((b) => b.label)}
								values={analytics.particleSizeBins.map((b) =>
									dataFilter === "simulated" ? b.simulatedCount
										: dataFilter === "real" ? b.realCount : b.count
								)}
								ylabel="Count"
								yMin={0}
								darkMode={darkMode}
							/>
						</ChartCard>
					</div>
				</div>

				{/* Drill-down panel */}
				{selectedCategory && selectedSlice && (
					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
									Drill-down: {selectedCategory}
								</h3>
								<p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
									Selected: <span className="font-medium">{selectedSlice}</span>
									{" — "}
									{(() => {
										const item = chartData.find((c) => c.name === selectedSlice);
										if (!item) return "";
										const val = dataFilter === "simulated" ? item.simulatedCount
											: dataFilter === "real" ? item.realCount : item.count;
										const totalArr = getFilteredValues(chartData, dataFilter);
										const total = totalArr.reduce((s, v) => s + v, 0);
										const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
										return `${val} scaffolds (${pct}%)`;
									})()}
								</p>
							</div>
							<button
								onClick={() => dashboardStore.clearDrillDown()}
								className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 text-sm"
							>
								Close
							</button>
						</div>
					</div>
				)}

				{/* Data transfer over time */}
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
					<div className="flex items-center gap-3 mb-2">
						<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data Transfer</h3>
						<div className="flex items-center gap-1.5">
							<Pill label="Uploads" active={transferMode === "uploads"} onClick={() => setTransferMode("uploads")} />
							<Pill label="Downloads" active={transferMode === "downloads"} onClick={() => setTransferMode("downloads")} />
						</div>
					</div>
					<div className="h-64">
						<AreaChart
							labels={(transferMode === "uploads" ? analytics.uploadsOverTime : analytics.downloadsOverTime).map((u) => u.period)}
							values={(transferMode === "uploads" ? analytics.uploadsOverTime : analytics.downloadsOverTime).map((u) => u.count)}
							ylabel={transferMode === "uploads" ? "Uploads" : "Downloads"}
							yMin={0}
							darkMode={darkMode}
						/>
					</div>
				</div>
			</section>

			{/* ── RDF Database section ── */}
			<section className="space-y-4">
				<h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">RDF Database</h2>
				<RdfVisualization height={550} />
			</section>
		</div>
	);
});

export default Dashboard;
