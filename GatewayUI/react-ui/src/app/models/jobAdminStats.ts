export interface JobAdminStats {
	totalJobs: number;
	completedCount: number;
	failedCount: number;
	pendingCount: number;
	runningCount: number;
	stoppedCount: number;
	jobTypeCounts: JobTypeCount[];
	monthlyCounts: JobMonthlyCount[];
}

export interface JobTypeCount {
	jobType: string;
	count: number;
}

export interface JobMonthlyCount {
	period: string;
	total: number;
	completed: number;
	failed: number;
	other: number;
}

export interface UserFailureRanking {
	userId: string;
	email: string | null;
	userName: string | null;
	failureCount: number;
	lastFailureAt: string;
}
