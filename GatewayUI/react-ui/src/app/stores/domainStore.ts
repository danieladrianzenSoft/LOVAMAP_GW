import { makeAutoObservable } from "mobx";
import agent from "../api/agent";
import { Domain } from "../models/domain";
import { runInAction } from "mobx";

export default class DomainStore {
	domainMesh: Blob | null = null; // Store .glb file
    domainMetadata: Domain | null = null; // Store metadata
    domainMeshUrl: string | null = null;
	isFetchingDomain: boolean = false;
    cacheLimit: number = 3;
    domainCache: Map<number, { mesh: Blob, metadata: Domain }> = new Map(); // Caching up to 3 domains

	constructor() {
		makeAutoObservable(this)
	}

	visualizeDomain = async (scaffoldId: number) => {
		try {
            runInAction(() => {
                this.isFetchingDomain = true;
                if (this.domainMeshUrl) {
                    URL.revokeObjectURL(this.domainMeshUrl);
                    this.domainMeshUrl = null;  // Clear previous mesh early to prevent WebGL issues
                }
                this.domainMesh = null;
                this.domainMetadata = null;
            })

            // Check cache first
            if (this.domainCache.has(scaffoldId)) {
                runInAction(() => {
                    const cached = this.domainCache.get(scaffoldId);
                    this.domainMesh = cached!.mesh;
                    this.domainMeshUrl = URL.createObjectURL(cached!.mesh);
                    this.domainMetadata = cached!.metadata;
                    this.isFetchingDomain = false;
                })
                return;
            }

            // Fetch new data
            const { file, domain } = await agent.Domains.visualize(scaffoldId);

            runInAction(() => {
                // Store in cache
                this.domainCache.set(scaffoldId, { mesh: file, metadata: domain });

                // If cache exceeds limit, remove the oldest entry (FIFO order)
                if (this.domainCache.size > this.cacheLimit) {
                    const oldestKey = this.domainCache.keys().next().value; // Get first inserted key
                    if (oldestKey !== undefined) {
                        this.domainCache.delete(oldestKey);
                    }
                }
                this.domainMesh = file;
                this.domainMeshUrl = URL.createObjectURL(file);
                this.domainMetadata = domain;
                this.isFetchingDomain = false;
            })
        } catch (error) {
            console.error("Failed to fetch domain mesh", error);
            runInAction(() => {
                this.domainMesh = null;  // Clear mesh on failure
                this.domainMeshUrl = null;
                this.domainMetadata = null;
                this.isFetchingDomain = false;
            })
        }
	}

    clearDomainMesh = () => {
        if (this.domainMeshUrl) {
            URL.revokeObjectURL(this.domainMeshUrl);
            this.domainMeshUrl = null;
        }
    this.domainMesh = null;
        this.domainMetadata = null;
    };
    
    uploadDomainMesh = async (scaffoldId: number, file: File) => {
        try {
            const formData = new FormData();
            formData.append("ScaffoldId", scaffoldId.toString());
            formData.append("MeshFile", file);

            const response = await agent.Domains.createDomain(formData);

            if (response.statusCode === 201) {
                console.log("Mesh file uploaded successfully:", response.data);
                this.visualizeDomain(scaffoldId); // Refresh visualization
            } else {
                console.error("Error uploading mesh file:", response.message);
            }
        } catch (error) {
            console.error("Failed to upload domain mesh", error);
        }
    };
}