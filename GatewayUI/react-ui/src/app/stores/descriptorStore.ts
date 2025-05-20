import { makeAutoObservable } from "mobx";
import agent from "../api/agent";
import { PoreInfo, PoreInfoForScaffoldGroup } from "../models/poreInfo";
import { runInAction } from "mobx";

export default class DescriptorStore {
	poreInfoCache: Map<number, PoreInfo> = new Map();
	
	constructor() {
		makeAutoObservable(this)
	}

	getPoreInfo = async (scaffoldGroupId: number): Promise<PoreInfo | null> => {
		if (this.poreInfoCache.has(scaffoldGroupId)) {
			const existing = this.poreInfoCache.get(scaffoldGroupId)!;
			this.poreInfoCache.delete(scaffoldGroupId); // remove old position
			this.poreInfoCache.set(scaffoldGroupId, existing); // re-insert at end
			return existing;
		  }
		try {
			const apiResponse = await agent.Descriptors.getPoreInfo(scaffoldGroupId);
			if (apiResponse?.data) {
				runInAction(() => {
					if (this.poreInfoCache.size >= 5) {
						const oldestKey = this.poreInfoCache.keys().next().value;
						if (typeof oldestKey === 'number') {
							this.poreInfoCache.delete(oldestKey);
						}
					}
					this.poreInfoCache.set(scaffoldGroupId, apiResponse.data);
				});
				return apiResponse.data;
			}
		} catch (error) {
			console.error("Failed to fetch pore info:", error);
		}
		return null;
	}

	clearPoreInfoCache = () => {
		this.poreInfoCache.clear();
	};

	getPoreInfoForScaffoldGroup = async (scaffoldGroupId: number): Promise<PoreInfoForScaffoldGroup | null> => {
		try {
			const apiResponse = await agent.Descriptors.getPoreInfoForScaffoldGroup(scaffoldGroupId);
			return apiResponse.data;
		} catch (error) {
			console.error("Failed to fetch pore info:", error);
		}
		return null;
	}

	getPoreInfoForRandomScaffoldGroup = async (): Promise<PoreInfoForScaffoldGroup | null> => {
		try {
			const apiResponse = await agent.Descriptors.getPoreInfoForRandomScaffoldGroup();
			return apiResponse.data;
		} catch (error) {
			console.error("Failed to fetch pore info:", error);
		}
		return null;
	}


}