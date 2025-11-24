import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { Job } from "../models/job";

export default class JobStore {
	jobsRan: Job[] = [];

	constructor() {
		makeAutoObservable(this)
	}

	submitJob = async (
        job: Job,
    ): Promise<Job | null> => {
        try {
            const response = await agent.Jobs.submitJob(job);
			runInAction(() => {
				console.log(response.data);
			})
			return response.data;
        } catch (error) {
            console.error('Error uploading file for scaffold group:', error);
			return null;
        }
    };

}