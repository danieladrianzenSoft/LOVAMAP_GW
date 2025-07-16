import { makeAutoObservable } from "mobx";
import agent from "../api/agent";
import { PoreInfo, PoreInfoForScaffoldGroup } from "../models/poreInfo";
import { runInAction } from "mobx";
import { DescriptorType } from "../models/descriptorType";

export default class DescriptorStore {
	descriptorTypes: DescriptorType[] = [];
	isFetchingDescriptors: boolean = false;
	poreInfoCache: Map<number, PoreInfo> = new Map();
	
	constructor() {
		makeAutoObservable(this)
	}

	getDescriptorTypes = async (forceRefresh = false): Promise<DescriptorType[]> => {
		if (!forceRefresh && this.descriptorTypes.length > 0) {
			return this.descriptorTypes;
		}

		this.isFetchingDescriptors = true;

		try {
			const response = await agent.Descriptors.getAllDescriptorTypes();
			const fetched = response.data || [];

			runInAction(() => {
				this.descriptorTypes = fetched;
			});

			return fetched;
		} catch (error) {
			console.error("Failed to fetch descriptor types", error);
			runInAction(() => {
				this.descriptorTypes = [];
			});
			return [];
		} finally {
			runInAction(() => {
				this.isFetchingDescriptors = false;
			});
		}
	};

	getDescriptorByTypeId = (id: number): DescriptorType | undefined => {
		return this.descriptorTypes.find((d) => d.id === id);
	};

	clearDescriptorCache = () => {
		this.descriptorTypes = [];
	};

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

	getPoreInfoForScaffoldGroup = async (scaffoldGroupId: number, descriptorTypeIds: number[]): Promise<PoreInfoForScaffoldGroup | null> => {
		try {
			let queryParams = '';
			if (descriptorTypeIds.length > 0) {
				queryParams += descriptorTypeIds.map(id => `descriptorTypeIds=${id}`).join('&');
			}
			if (queryParams !== '') queryParams = '?' + queryParams;
			const apiResponse = await agent.Descriptors.getPoreInfoForScaffoldGroup(scaffoldGroupId, queryParams);
			return apiResponse.data;
		} catch (error) {
			console.error("Failed to fetch pore info:", error);
		}
		return null;
	}

	getPoreInfoForRandomScaffoldGroup = async (descriptorTypeIds: number[]): Promise<PoreInfoForScaffoldGroup | null> => {
		try {
			let queryParams = '';
			if (descriptorTypeIds.length > 0) {
				queryParams += descriptorTypeIds.map(id => `descriptorTypeIds=${id}`).join('&');
			}
			if (queryParams !== '') queryParams = '?' + queryParams;
			const apiResponse = await agent.Descriptors.getPoreInfoForRandomScaffoldGroup(queryParams);
			return apiResponse.data;
		} catch (error) {
			console.error("Failed to fetch pore info:", error);
		}
		return null;
	}
}