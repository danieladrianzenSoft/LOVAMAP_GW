import { makeAutoObservable } from "mobx";
import agent from "../api/agent";
import { DescriptorSeedResult } from "../models/descriptor";

export default class SeedStore {

	constructor() {
		makeAutoObservable(this)
	}

	getEligibleScaffoldIdsForDescriptorSeeding = async(descriptorName: string): Promise<number[] | null> => {
		try {
			const apiResponse = await agent.Seed.getEligibleScaffoldIdsForDescriptorSeeding(descriptorName);
			return apiResponse.data;
		} catch (error) {
			console.error("Failed to get scaffold ids for descriptor seeding", error);
		}
		return null;
	}

	seedDescriptor = async (descriptorName: string, scaffoldIds: number[]): Promise<DescriptorSeedResult | null> => {
		try {
			const body = {'descriptorName': descriptorName, 'scaffoldIds': scaffoldIds}
			const apiResponse = await agent.Seed.seedDescriptors(body);
			return apiResponse.data;
		} catch (error) {
			console.error("Failed to seed descriptor", error);
		}
		return null;
	}
}