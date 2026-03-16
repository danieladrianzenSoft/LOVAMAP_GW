export interface CategoryCount {
	name: string;
	count: number;
	simulatedCount: number;
	realCount: number;
}

export interface SizeBin {
	label: string;
	minSize: number;
	maxSize: number;
	count: number;
	simulatedCount: number;
	realCount: number;
}

export interface TimeSeriesPoint {
	period: string;
	count: number;
}

export interface DashboardAnalytics {
	totalScaffolds: number;
	totalScaffoldGroups: number;
	simulatedGroupCount: number;
	realGroupCount: number;
	simulatedScaffoldCount: number;
	realScaffoldCount: number;
	publicCount: number;
	privateCount: number;
	tagDistributions: Record<string, CategoryCount[]>;
	packingConfigurationDistribution: CategoryCount[];
	containerShapeDistribution: CategoryCount[];
	particleSizeBins: SizeBin[];
	uploadsOverTime: TimeSeriesPoint[];
	downloadsOverTime: TimeSeriesPoint[];
}
