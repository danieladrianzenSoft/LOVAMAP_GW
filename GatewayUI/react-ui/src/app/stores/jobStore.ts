import { makeAutoObservable, runInAction } from "mobx";
import * as signalR from "@microsoft/signalr";
import agent from "../api/agent";
import { Job, JobForList, LovamapFromSourceJob, MeshJob, SaveLovamapResultRequest, SegmentationJob } from "../models/job";
import { store } from "./store";
import environment from "../environments/environment";

export default class JobStore {
	jobsRan: JobForList[] = [];
	private hubConnection: signalR.HubConnection | null = null;

	constructor() {
		makeAutoObservable(this)
	}

	startConnection = () => {
		if (this.hubConnection) return;

		const hubUrl = environment.baseUrl.replace("/api", "") + "/hubs/job-status";
		this.hubConnection = new signalR.HubConnectionBuilder()
			.withUrl(hubUrl, {
				accessTokenFactory: () => store.commonStore.getAccessToken ?? "",
			})
			.withAutomaticReconnect()
			.build();

		this.hubConnection.on("JobStatusUpdated", (updatedJob: JobForList) => {
			runInAction(() => {
				const index = this.jobsRan.findIndex((j) => j.id === updatedJob.id);
				if (index !== -1) {
					this.jobsRan = [
						...this.jobsRan.slice(0, index),
						updatedJob,
						...this.jobsRan.slice(index + 1),
					];
				}
			});
		});

		this.hubConnection.start().catch((err) =>
			console.error("SignalR connection error:", err)
		);
	};

	stopConnection = () => {
		if (this.hubConnection) {
			this.hubConnection.stop();
			this.hubConnection = null;
		}
	};

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

	submitSegmentationJob = async (job: SegmentationJob): Promise<any | null> => {
		try {
			const response = await agent.Jobs.submitSegmentationJob(job);
			return response.data;
		} catch (error) {
			console.error('Error submitting segmentation job:', error);
			return null;
		}
	};

	submitMeshJob = async (job: MeshJob): Promise<any | null> => {
		try {
			const response = await agent.Jobs.submitMeshJob(job);
			return response.data;
		} catch (error) {
			console.error('Error submitting mesh job:', error);
			return null;
		}
	};

	submitLovamapFromSource = async (job: LovamapFromSourceJob): Promise<any | null> => {
		try {
			const response = await agent.Jobs.submitLovamapFromSource(job);
			return response.data;
		} catch (error) {
			console.error('Error submitting lovamap from source job:', error);
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

	getAllJobs = async (): Promise<JobForList[] | null> => {
		try {
			const response = await agent.Jobs.getAllJobs();
			runInAction(() => {
				this.jobsRan = response.data;
			})
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

	getJobResultAsJson = async (jobId: string): Promise<any | null> => {
		const blob = await this.getJobResult(jobId);
		if (!blob) return null;
		const text = await blob.text();
		return JSON.parse(text);
	}

	getMeshStatus = async (jobId: string) => {
		try {
			const response = await agent.Jobs.getMeshStatus(jobId);
			return response.data ?? null;
		} catch {
			return null;
		}
	}

	getJobMesh = async (jobId: string): Promise<Blob | null> => {
		try {
			const data = await agent.Jobs.getJobMesh(jobId);
			return data;
		} catch (error) {
			console.error('Error fetching job mesh:', error);
			return null;
		}
	}

	getJobParticleMesh = async (jobId: string): Promise<Blob | null> => {
		try {
			const data = await agent.Jobs.getJobParticleMesh(jobId);
			return data;
		} catch (error) {
			console.error('Error fetching job particle mesh:', error);
			return null;
		}
	}

	saveJobAsScaffold = async (jobId: string, data: SaveLovamapResultRequest): Promise<{ scaffoldGroupId: number; scaffoldId: number } | null> => {
		try {
			const response = await agent.Jobs.saveJobAsScaffold(jobId, data);
			const d = response.data;
			if (!d) return null;
			return { scaffoldGroupId: d.scaffoldGroupId, scaffoldId: d.scaffoldId };
		} catch (error) {
			console.error('Error saving job as scaffold:', error);
			throw error;
		}
	}
}