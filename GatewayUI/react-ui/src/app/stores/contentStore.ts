import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { ContentPageSummary, ContentPageDetail } from "../models/contentPage";

export default class ContentStore {
	pagesByArea: Map<string, ContentPageSummary[]> = new Map();
	pagesBySlug: Map<string, ContentPageDetail> = new Map();

	constructor() {
		makeAutoObservable(this);
	}

	getPagesByArea = async (area: string): Promise<ContentPageSummary[]> => {
		const cached = this.pagesByArea.get(area);
		if (cached) return cached;

		const response = await agent.Content.getPages(area);
		const pages = response.data;
		runInAction(() => {
			this.pagesByArea.set(area, pages);
		});
		return pages;
	};

	getPageBySlug = async (slug: string): Promise<ContentPageDetail> => {
		const cached = this.pagesBySlug.get(slug);
		if (cached) return cached;

		const response = await agent.Content.getPageBySlug(slug);
		const page = response.data;
		runInAction(() => {
			this.pagesBySlug.set(slug, page);
		});
		return page;
	};

	invalidateSlug = (slug: string) => {
		this.pagesBySlug.delete(slug);
	};

	invalidateArea = (area: string) => {
		this.pagesByArea.delete(area);
	};
}
