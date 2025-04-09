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
        dx: number = 1
    ): Promise<Job | null> => {
        try {
            const response = await agent.Jobs.submitJob(job, dx);
			runInAction(() => {
				console.log(response.data);
			})
			return response.data;
        } catch (error) {
            console.error('Error uploading image for scaffold group:', error);
			return null;
        }
    };

}