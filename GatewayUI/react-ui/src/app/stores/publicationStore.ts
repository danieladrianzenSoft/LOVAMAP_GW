import { makeAutoObservable } from "mobx";
import { Publication } from "../models/publication";
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
			console.log(apiResponse);
			return apiResponse.data;
		} catch (error) {
			console.error("Error fetching publications", error);
			return [];
		}
	}
}
