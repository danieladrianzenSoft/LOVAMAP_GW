import { makeAutoObservable } from "mobx";
import agent from "../api/agent";
import { Domain } from "../models/domain";

export default class DomainStore {
	domainMesh: Blob | null = null; // Store .glb file
    domainMetadata: Domain | null = null; // Store metadata
	isFetchingDomain: boolean = false;
    cacheLimit: number = 3;
    domainCache: Map<number, { mesh: Blob, metadata: Domain }> = new Map(); // Caching up to 3 domains

	constructor() {
		makeAutoObservable(this)
	}

	visualizeDomain = async (scaffoldId: number) => {
		try {
            this.isFetchingDomain = true;

            // Check cache first
            if (this.domainCache.has(scaffoldId)) {
                const cached = this.domainCache.get(scaffoldId);
                this.domainMesh = cached!.mesh;
                this.domainMetadata = cached!.metadata;
                return;
            }

            // Fetch new data
            const { file, domain } = await agent.Domains.visualize(scaffoldId);

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
            this.domainMetadata = domain;
        } catch (error) {
            console.error("Failed to fetch domain mesh", error);
            this.domainMesh = null;  // Clear mesh on failure
            this.domainMetadata = null;
        } finally {
            this.isFetchingDomain = false;
        }
	}
    
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