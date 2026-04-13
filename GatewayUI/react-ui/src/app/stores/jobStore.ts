import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { Job, JobForList } from "../models/job";

export default class JobStore {
	jobsRan: JobForList[] = [];

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

	getUserJobs = async (): Promise<JobForList[] | null> => {
		try {
			const response = await agent.Jobs.getUserJobs();
			runInAction(() => {
				this.jobsRan = response.data;
			})
			return response.data;
		} catch (error) {
			console.error('Error fetching user jobs:', error);
			return null;
		}
	}

	// 4/13 JacklynX changed - get all jobs for admin use in dataset descriptor rules
	getAllJobs = async (): Promise<JobForList[] | null> => {
		try {
			const response = await agent.Jobs.getAllJobs();
			return response.data;
		} catch (error) {
			console.error('Error fetching all jobs:', error);
			return null;
		}
	}

	getJobResult = async (jobId: string): Promise<Blob | null> => {
		try {
			const data = await agent.Jobs.getJobResult(jobId);
			return data;
		} catch (error) {
			console.error('Error fetching job result:', error);
			return null;
		}
	}
}