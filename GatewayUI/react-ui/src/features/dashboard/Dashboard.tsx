import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import Plot from "react-plotly.js";
import { useStore } from "../../app/stores/store";
import { CategoryCount } from "../../app/models/dashboardAnalytics";
import { DonutChart } from "../plotting/donut-chart";
import { BarChart } from "../plotting/bar-chart";
import { AreaChart } from "../plotting/area-chart";
import LoadingSpinner from '../../app/common/loading-spinner/loading-spinner';
import DataTable, { DataTableColumn } from "../../app/common/data-table/data-table";
import PaginationControls from "../../app/common/pagination-controls/pagination-controls";
import { UserFailureRanking } from "../../app/models/jobAdminStats";
import JobTable from "../jobs/job-table";

type DataFilter = "all" | "simulated" | "real";
type TransferMode = "uploads" | "downloads";

const STATUS_COLORS = {
	completed: "#6366f1",
	failed: "#f59e0b",
	running: "#06b6d4",
	pending: "#a78bfa",
	stopped: "#78716c",
	other: "#a1a1aa",
};

const StatCard: React.FC<{ label: string; value: number | string; subtitle?: string }> = ({ label, value, subtitle }) => (
	<div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center">
		<span className="text-2xl font-bold text-gray-800 dark:text-white">{value}</span>
		<span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</span>
		{subtitle && <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</span>}
	</div>
);

const SummaryCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
	<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
		<div className="mt-1 text-2xl font-bold text-gray-800">{value.toLocaleString()}</div>
	</div>
);

const ChartCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
	title, children, className = ""
}) => (
	<div className={`bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col ${className}`}>
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
				: "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-secondary-100 dark:hover:bg-gray-600"
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
	const { dashboardStore, commonStore, jobAdminStatsStore } = useStore();
	const { analytics, loading, error, selectedCategory, selectedSlice } = dashboardStore;
	const {
		stats, loading: jobsLoading, error: jobsError, fromDate, toDate,
		failedJobs, failedJobsPagination, failedJobsLoading,
		userRankings, userRankingsPagination, userRankingsLoading,
	} = jobAdminStatsStore;
	const darkMode = commonStore.darkMode;
	const [groupBy, setGroupBy] = useState("shape");
	const [dataFilter, setDataFilter] = useState<DataFilter>("all");
	const [transferMode, setTransferMode] = useState<TransferMode>("uploads");

	useEffect(() => {
		dashboardStore.loadDashboardAnalytics();
	}, [dashboardStore]);

	useEffect(() => {
		jobAdminStatsStore.loadStats();
		jobAdminStatsStore.loadFailedJobs();
		jobAdminStatsStore.loadUserRankings();
	}, [jobAdminStatsStore]);

	// ── Jobs handlers ──
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const reloadFailedJobs = useCallback(async () => {
		jobAdminStatsStore.setFailedJobsPage(1);
		await jobAdminStatsStore.loadFailedJobs();
	}, [jobAdminStatsStore]);

	const handleFailedJobsPageChange = useCallback(async (page: number) => {
		jobAdminStatsStore.setFailedJobsPage(page);
		await jobAdminStatsStore.loadFailedJobs();
	}, [jobAdminStatsStore]);

	const handleFailedJobsSearchChange = useCallback((value: string) => {
		jobAdminStatsStore.setFailedJobsFilterSearch(value);
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		searchDebounceRef.current = setTimeout(() => {
			reloadFailedJobs();
		}, 400);
	}, [jobAdminStatsStore, reloadFailedJobs]);

	const failedJobsFilters = {
		status: jobAdminStatsStore.failedJobsFilterStatus,
		jobType: jobAdminStatsStore.failedJobsFilterJobType,
		search: jobAdminStatsStore.failedJobsFilterSearch,
		onStatusChange: (value: string) => {
			jobAdminStatsStore.setFailedJobsFilterStatus(value);
			reloadFailedJobs();
		},
		onJobTypeChange: (value: string) => {
			jobAdminStatsStore.setFailedJobsFilterJobType(value);
			reloadFailedJobs();
		},
		onSearchChange: handleFailedJobsSearchChange,
		onClear: () => {
			jobAdminStatsStore.clearFailedJobsFilters();
			reloadFailedJobs();
		},
	};

	const handleUserRankingsPageChange = useCallback(async (page: number) => {
		jobAdminStatsStore.setUserRankingsPage(page);
		await jobAdminStatsStore.loadUserRankings();
	}, [jobAdminStatsStore]);

	const rankingsPageOffset = userRankingsPagination
		? (userRankingsPagination.currentPage - 1) * userRankingsPagination.itemsPerPage
		: 0;

	const userRankingColumns: DataTableColumn<UserFailureRanking>[] = [
		{
			header: "#",
			render: (_row, index) => <span className="text-gray-400">{rankingsPageOffset + index + 1}</span>,
			cellClassName: "w-10",
		},
		{
			header: "User ID",
			render: (row) => (
				<span title={row.userId} className="font-mono text-xs">
					{row.userId.length > 12 ? row.userId.slice(0, 12) + "..." : row.userId}
				</span>
			),
		},
		{ header: "Email", render: (row) => row.email ?? "\u2014" },
		{ header: "Username", render: (row) => row.userName ?? "\u2014" },
		{
			header: "Failed Jobs",
			render: (row) => <span className="font-semibold">{row.failureCount}</span>,
		},
		{
			header: "Last Failure",
			render: (row) => new Date(row.lastFailureAt).toLocaleDateString(),
		},
	];

	const handleJobsApply = () => {
		jobAdminStatsStore.refreshAll();
	};

	// ── Scaffold data ──
	const groupByOptions = useMemo(() => {
		if (!analytics) return [];
		const tagKeys = Object.keys(analytics.tagDistributions);
		return [...tagKeys, PACKING_KEY];
	}, [analytics]);

	const chartData: CategoryCount[] = useMemo(() => {
		if (!analytics) return [];
		if (groupBy === PACKING_KEY) return analytics.packingConfigurationDistribution;
		return analytics.tagDistributions[groupBy] ?? [];
	}, [analytics, groupBy]);

	useEffect(() => {
		if (groupByOptions.length > 0 && !groupByOptions.includes(groupBy)) {
			setGroupBy(groupByOptions[0]);
		}
	}, [groupByOptions, groupBy]);

	if (loading && !analytics) {
		return (
			<div className="container mx-auto py-8 px-6">
				<LoadingSpinner className="h-64" />
			</div>
		);
	}

	if (error && !analytics) {
		return (
			<div className="container mx-auto py-8 px-6">
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
		<div className="container mx-auto py-8 px-6 space-y-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-12">
				<h1 className="text-3xl text-gray-700 font-bold dark:text-white">Dashboard</h1>
			</div>

			{/* ── Scaffold Data section ── */}
			<section className="space-y-4">
				<h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Scaffolds</h2>

				{/* Stat cards */}
				<div className="grid grid-cols-2 gap-4">
					<StatCard
						label="Scaffold Groups"
						value={analytics.totalScaffoldGroups}
						subtitle={`${analytics.simulatedGroupCount} simulated \u00b7 ${analytics.realGroupCount} real`}
					/>
					<StatCard
						label="Scaffolds"
						value={analytics.totalScaffolds}
						subtitle={`${analytics.simulatedScaffoldCount} simulated \u00b7 ${analytics.realScaffoldCount} real`}
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
						<div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col">
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
									{" \u2014 "}
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
				<div className="bg-white dark:bg-gray-800 rounded-lg p-4">
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

			{/* ── Jobs section ── */}
			<section className="space-y-4">
				<div className="flex flex-wrap items-end gap-4">
					<h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Jobs</h2>
					<div className="ml-auto flex items-end gap-3">
						<div>
							<label className="mb-1 block text-xs font-medium text-gray-500">From</label>
							<input
								type="date"
								value={fromDate}
								onChange={(e) => jobAdminStatsStore.setDateRange(e.target.value, toDate)}
								className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-gray-500">To</label>
							<input
								type="date"
								value={toDate}
								onChange={(e) => jobAdminStatsStore.setDateRange(fromDate, e.target.value)}
								className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
							/>
						</div>
						<button
							onClick={handleJobsApply}
							disabled={jobsLoading}
							className="rounded-md bg-gray-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
						>
							Apply
						</button>
					</div>
				</div>

				{jobsError && (
					<div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{jobsError}</div>
				)}

				{jobsLoading && !stats && (
					<div className="py-12 text-center text-gray-500">Loading job statistics...</div>
				)}

				{stats && (
					<>
						{/* Summary cards */}
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<SummaryCard label="Total" value={stats.totalJobs} />
							<SummaryCard label="Completed" value={stats.completedCount} />
							<SummaryCard label="Failed" value={stats.failedCount} />
							<SummaryCard label="Active" value={stats.pendingCount + stats.runningCount} />
						</div>

						{/* Charts row */}
						<div className="grid gap-6 lg:grid-cols-2">
							{/* Monthly stacked bar chart */}
							<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
								<h3 className="mb-2 text-sm font-semibold text-gray-600">Monthly Job Activity</h3>
								<div style={{ height: 320 }}>
									{stats.monthlyCounts.length > 0 ? (
										<Plot
											divId="monthly-jobs-bar"
											data={[
												{
													type: "bar",
													name: "Completed",
													x: stats.monthlyCounts.map((m) => m.period),
													y: stats.monthlyCounts.map((m) => m.completed),
													marker: { color: STATUS_COLORS.completed },
												},
												{
													type: "bar",
													name: "Failed",
													x: stats.monthlyCounts.map((m) => m.period),
													y: stats.monthlyCounts.map((m) => m.failed),
													marker: { color: STATUS_COLORS.failed },
												},
												{
													type: "bar",
													name: "Other",
													x: stats.monthlyCounts.map((m) => m.period),
													y: stats.monthlyCounts.map((m) => m.other),
													marker: { color: STATUS_COLORS.other },
												},
											]}
											layout={{
												barmode: "stack",
												paper_bgcolor: "rgba(0,0,0,0)",
												plot_bgcolor: "rgba(0,0,0,0)",
												margin: { t: 10, b: 60, l: 40, r: 10 },
												autosize: true,
												legend: { orientation: "h", y: -0.2 },
												xaxis: { tickfont: { size: 10, color: "#374151" }, gridcolor: "#e5e7eb" },
												yaxis: { tickfont: { size: 10, color: "#374151" }, gridcolor: "#e5e7eb", rangemode: "tozero" },
											}}
											config={{ displayModeBar: false, responsive: true }}
											useResizeHandler
											style={{ width: "100%", height: "100%" }}
										/>
									) : (
										<div className="flex h-full items-center justify-center text-sm text-gray-400">
											No data for this period
										</div>
									)}
								</div>
							</div>

							{/* Status donut chart */}
							<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
								<h3 className="mb-2 text-sm font-semibold text-gray-600">Status Breakdown</h3>
								<div style={{ height: 320 }}>
									<Plot
										divId="status-donut"
										data={[{
											type: "pie",
											labels: ["Completed", "Failed", "Pending", "Running", "Stopped"],
											values: [
												stats.completedCount,
												stats.failedCount,
												stats.pendingCount,
												stats.runningCount,
												stats.stoppedCount,
											],
											hole: 0.45,
											marker: { colors: [
												STATUS_COLORS.completed,
												STATUS_COLORS.failed,
												STATUS_COLORS.pending,
												STATUS_COLORS.running,
												STATUS_COLORS.stopped,
											]},
											textinfo: "label+percent",
											textposition: "outside",
											textfont: { size: 11, color: "#374151" },
											hoverinfo: "label+value+percent",
											sort: false,
										}]}
										layout={{
											showlegend: false,
											paper_bgcolor: "rgba(0,0,0,0)",
											plot_bgcolor: "rgba(0,0,0,0)",
											margin: { t: 10, b: 10, l: 10, r: 10 },
											autosize: true,
										}}
										config={{ displayModeBar: false, responsive: true }}
										useResizeHandler
										style={{ width: "100%", height: "100%" }}
									/>
								</div>
							</div>
						</div>

						{/* Users ranked by failure count */}
						<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
							<h3 className="mb-3 text-sm font-semibold text-gray-600">
								Users by Failure Count
								{userRankingsPagination && (
									<span className="ml-2 font-normal text-gray-400">
										({userRankingsPagination.totalItems} users)
									</span>
								)}
							</h3>
							{userRankingsLoading ? (
								<div className="py-6 text-center text-sm text-gray-400">Loading...</div>
							) : (
								<>
									<DataTable
										data={userRankings}
										columns={userRankingColumns}
										rowKey={(row) => row.userId}
										emptyMessage="No failed jobs in this period."
									/>
									{userRankingsPagination && (
										<PaginationControls pagination={userRankingsPagination} onPageChange={handleUserRankingsPageChange} />
									)}
								</>
							)}
						</div>

						{/* Jobs table with filters */}
						<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
							<h3 className="mb-3 text-sm font-semibold text-gray-600">
								Jobs
								{failedJobsPagination && (
									<span className="ml-2 font-normal text-gray-400">
										({failedJobsPagination.totalItems} total)
									</span>
								)}
							</h3>
							<JobTable
								jobs={failedJobs}
								isAdmin={true}
								pagination={failedJobsPagination}
								onPageChange={handleFailedJobsPageChange}
								filters={failedJobsFilters}
								isLoading={failedJobsLoading}
								emptyMessage="No jobs found."
							/>
						</div>
					</>
				)}
			</section>
		</div>
	);
});

export default Dashboard;
