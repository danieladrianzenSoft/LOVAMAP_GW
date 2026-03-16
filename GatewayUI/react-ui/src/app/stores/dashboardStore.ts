import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { DashboardAnalytics } from "../models/dashboardAnalytics";

export default class DashboardStore {
	analytics: DashboardAnalytics | null = null;
	loading = false;
	error: string | null = null;
	selectedCategory: string | null = null;
	selectedSlice: string | null = null;

	constructor() {
		makeAutoObservable(this);
	}

	loadDashboardAnalytics = async () => {
		if (this.loading) return;
		this.loading = true;
		this.error = null;
		try {
			const response = await agent.Analytics.getDashboardAnalytics();
			runInAction(() => {
				this.analytics = response.data;
				this.loading = false;
			});
		} catch (err: any) {
			runInAction(() => {
				this.error = err?.message || "Failed to load dashboard analytics";
				this.loading = false;
			});
		}
	};

	refreshAnalytics = async () => {
		this.analytics = null;
		await this.loadDashboardAnalytics();
	};

	setDrillDown = (category: string, slice: string) => {
		this.selectedCategory = category;
		this.selectedSlice = slice;
	};

	clearDrillDown = () => {
		this.selectedCategory = null;
		this.selectedSlice = null;
	};
}
