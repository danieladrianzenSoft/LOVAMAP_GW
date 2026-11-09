import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { JobAdminStats, UserFailureRanking } from "../models/jobAdminStats";
import { JobForList, Pagination } from "../models/job";

export default class JobAdminStatsStore {
	stats: JobAdminStats | null = null;
	loading = false;
	error: string | null = null;
	fromDate: string = "";
	toDate: string = "";

	// Failed jobs pagination & filters
	failedJobs: JobForList[] = [];
	failedJobsPagination: Pagination | null = null;
	failedJobsPage = 1;
	failedJobsLoading = false;
	failedJobsFilterStatus = 'Failed';
	failedJobsFilterJobType = '';
	failedJobsFilterSearch = '';

	// User failure rankings pagination
	userRankings: UserFailureRanking[] = [];
	userRankingsPagination: Pagination | null = null;
	userRankingsPage = 1;
	userRankingsLoading = false;

	constructor() {
		makeAutoObservable(this);
		const now = new Date();
		const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
		this.toDate = now.toISOString().slice(0, 10);
		this.fromDate = twelveMonthsAgo.toISOString().slice(0, 10);
	}

	loadStats = async () => {
		if (this.loading) return;
		this.loading = true;
		this.error = null;
		try {
			const response = await agent.Admin.getJobStats(this.fromDate, this.toDate);
			runInAction(() => {
				this.stats = response.data;
				this.loading = false;
			});
		} catch (err: any) {
			runInAction(() => {
				this.error = err?.message || "Failed to load job stats";
				this.loading = false;
			});
		}
	};

	loadFailedJobs = async () => {
		this.failedJobsLoading = true;
		try {
			const filters: { status?: string; jobType?: string; search?: string } = {};
			if (this.failedJobsFilterStatus) filters.status = this.failedJobsFilterStatus;
			if (this.failedJobsFilterJobType) filters.jobType = this.failedJobsFilterJobType;
			if (this.failedJobsFilterSearch) filters.search = this.failedJobsFilterSearch;
			const response = await agent.Jobs.getAllJobs(this.failedJobsPage, 10, filters);
			runInAction(() => {
				this.failedJobs = response.data;
				this.failedJobsPagination = response.pagination;
				this.failedJobsLoading = false;
			});
		} catch {
			runInAction(() => { this.failedJobsLoading = false; });
		}
	};

	setFailedJobsFilterStatus = (value: string) => {
		this.failedJobsFilterStatus = value;
	};

	setFailedJobsFilterJobType = (value: string) => {
		this.failedJobsFilterJobType = value;
	};

	setFailedJobsFilterSearch = (value: string) => {
		this.failedJobsFilterSearch = value;
	};

	clearFailedJobsFilters = () => {
		this.failedJobsFilterStatus = '';
		this.failedJobsFilterJobType = '';
		this.failedJobsFilterSearch = '';
	};

	loadUserRankings = async () => {
		this.userRankingsLoading = true;
		try {
			const response = await agent.Admin.getUserFailureRankings(this.fromDate, this.toDate, this.userRankingsPage);
			runInAction(() => {
				this.userRankings = response.data;
				this.userRankingsPagination = response.pagination;
				this.userRankingsLoading = false;
			});
		} catch {
			runInAction(() => { this.userRankingsLoading = false; });
		}
	};

	setFailedJobsPage = (page: number) => {
		this.failedJobsPage = page;
	};

	setUserRankingsPage = (page: number) => {
		this.userRankingsPage = page;
	};

	refreshAll = async () => {
		this.stats = null;
		this.failedJobsPage = 1;
		this.failedJobsFilterStatus = 'Failed';
		this.failedJobsFilterJobType = '';
		this.failedJobsFilterSearch = '';
		this.userRankingsPage = 1;
		await Promise.all([this.loadStats(), this.loadFailedJobs(), this.loadUserRankings()]);
	};

	setDateRange = (from: string, to: string) => {
		this.fromDate = from;
		this.toDate = to;
	};
}
