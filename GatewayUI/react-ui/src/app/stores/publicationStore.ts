import { makeAutoObservable } from "mobx";
import { Publication, PublicationToCreate, DescriptorRuleToCreate } from "../models/publication";
import agent from "../api/agent";

export default class PublicationStore {
	constructor() {
		makeAutoObservable(this)
	}

	getPublication = async(publicationId: number): Promise<Publication | null> => {
		try {
			const apiRepsonse = await agent.Publications.getById(publicationId)
			return apiRepsonse.data;
		} catch (error) {
			console.error(`Error fetching publication ${publicationId}`, error);
			return null;
		}
	}

	getPublications = async(): Promise<Publication[]> => {
		try {
			const apiResponse = await agent.Publications.getAll();
			return apiResponse.data;
		} catch (error) {
			console.error("Error fetching publications", error);
			return [];
		}
	}

	createPublication = async(data: PublicationToCreate): Promise<{ success: boolean; error?: string }> => {
		try {
			await agent.Publications.create(data);
			return { success: true };
		} catch (error: any) {
			const msg = error?.response?.data?.message || "Failed to create publication.";
			console.error("Error creating publication", error);
			return { success: false, error: msg };
		}
	}

	updatePublication = async(publicationId: number, data: PublicationToCreate): Promise<{ success: boolean; error?: string }> => {
		try {
			await agent.Publications.update(publicationId, data);
			return { success: true };
		} catch (error: any) {
			const msg = error?.response?.data?.message || "Failed to update publication.";
			console.error("Error updating publication", error);
			return { success: false, error: msg };
		}
	}

	createDataset = async(publicationId: number, scaffoldIds: number[], descriptorRules: DescriptorRuleToCreate[]): Promise<{ success: boolean; error?: string }> => {
		try {
			await agent.Publications.createDataset(publicationId, { name: "Main", scaffoldIds, descriptorRules });
			return { success: true };
		} catch (error: any) {
			const msg = error?.response?.data?.message || "Failed to create dataset.";
			console.error("Error creating dataset", error);
			return { success: false, error: msg };
		}
	}

	upsertDataset = async(publicationId: number, scaffoldIds: number[], descriptorRules: DescriptorRuleToCreate[]): Promise<{ success: boolean; error?: string }> => {
		try {
			await agent.Publications.upsertDataset(publicationId, { name: "Main", scaffoldIds, descriptorRules });
			return { success: true };
		} catch (error: any) {
			const msg = error?.response?.data?.message || "Failed to update dataset.";
			console.error("Error updating dataset", error);
			return { success: false, error: msg };
		}
	}

	deletePublication = async(publicationId: number): Promise<{ success: boolean; error?: string }> => {
		try {
			await agent.Publications.delete(publicationId);
			return { success: true };
		} catch (error: any) {
			const msg = error?.response?.data?.message || "Failed to delete publication.";
			console.error("Error deleting publication", error);
			return { success: false, error: msg };
		}
	}
}
