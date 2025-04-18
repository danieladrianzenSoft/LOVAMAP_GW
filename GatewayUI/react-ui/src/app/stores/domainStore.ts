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

	visualizeDomain = async (scaffoldId?: number | null): Promise<number | undefined> => {
        try {
            runInAction(() => {
                this.isFetchingDomain = true;
    
                if (this.domainMeshUrl) {
                    URL.revokeObjectURL(this.domainMeshUrl);
                    this.domainMeshUrl = null;
                }
    
                this.domainMesh = null;
                this.domainMetadata = null;
            });
    
            if (typeof scaffoldId === 'number' && this.domainCache.has(scaffoldId)) {
                const cached = this.domainCache.get(scaffoldId)!;
    
                runInAction(() => {
                    this.domainMesh = cached.mesh;
                    this.domainMeshUrl = URL.createObjectURL(cached.mesh);
                    this.domainMetadata = cached.metadata;
                    this.isFetchingDomain = false;
                });
    
                return cached.metadata.scaffoldId;
            }
    
            const { file, domain } = await agent.Domains.visualize(scaffoldId);
            const cacheKey = domain.id;
    
            runInAction(() => {
                if (typeof cacheKey === 'number') {
                    this.domainCache.set(cacheKey, { mesh: file, metadata: domain });
    
                    if (this.domainCache.size > this.cacheLimit) {
                        const oldestKey = this.domainCache.keys().next().value;
                        if (oldestKey !== undefined) {
                            this.domainCache.delete(oldestKey);
                        }
                    }
                }
    
                this.domainMesh = file;
                this.domainMeshUrl = URL.createObjectURL(file);
                this.domainMetadata = domain;
                this.isFetchingDomain = false;
            });
    
            return domain.scaffoldId;
    
        } catch (error) {
            runInAction(() => {
                this.domainMesh = null;
                this.domainMeshUrl = null;
                this.domainMetadata = null;
                this.isFetchingDomain = false;
            });
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
    
    uploadDomainMesh = async (
        scaffoldId: number, 
        file: File,
        category: number,
        voxelSize?: number,
        domainSize?: string
    ) => {
        try {
            const formData = new FormData();
            formData.append("ScaffoldId", scaffoldId.toString());
            formData.append("Category", category.toString());
            formData.append("MeshFile", file);

            if (voxelSize) formData.append("VoxelSize", voxelSize.toString());
            if (domainSize) formData.append("DomainSize", domainSize);

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