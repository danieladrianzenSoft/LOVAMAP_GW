import { makeAutoObservable } from "mobx";
import agent from "../api/agent";
import { Domain } from "../models/domain";
import { runInAction } from "mobx";
import { DomainMetadata } from "../models/domainMetadata";

// getDomainMetadata = async(category:number, domainId?: number): Promise<any> => {
//         if (!domainId) return;
//         if (this.domainMetadataCache.has(domainId)) {
//             runInAction(() => {
//                 const metadata = this.domainMetadataCache.get(domainId);
//                 if (metadata) {
//                     this.domainMetadata = metadata;
//                     console.log(metadata);
//                 }
//             });
//             return this.domainMetadata
//         }

//         try {
//             const response = await agent.Domains.getDomainMetadata(domainId);
//             runInAction(() => {
//                 if (response.data) {
//                     this.updateDomainMetadataCache(domainId, response.data);
//                     this.activeDomainMetadata[category] = response.data;
//                     this.domainMetadata = response.data;
//                 }
//             });
//             return response.data;
//         } catch (error) {
//             console.error(error);
//             runInAction(() => {
//                 this.domainMetadata = null;
//             });
//         }
//     }

// visualizeDomain = async (
//         scaffoldId?: number | null, 
//         category: number = 0,
//         forceRefresh: boolean = false
//     ): Promise<number | undefined> => {
//         try {
//             this.isFetchingDomain = true;
    
//             // If scaffoldId is defined, attempt to load from cache
//             if (scaffoldId != null) {
//                 const key = this.getDomainCacheKey(scaffoldId, category);
//                 if (!forceRefresh && this.domainCache.has(key)) {
//                     const cached = this.domainCache.get(key)!;
//                     runInAction(() => {
//                         if (this.domainMeshUrl) {
//                             URL.revokeObjectURL(this.domainMeshUrl);
//                             this.domainMeshUrl = null;
//                         }
//                         this.domainMesh = cached.mesh;
//                         this.domainMeshUrl = URL.createObjectURL(cached.mesh);
//                         this.domain = cached.domain;
//                         this.isFetchingDomain = false;
//                     });
//                     return cached.domain.scaffoldId;
//                 }
//             }
    
//             // Fetch from API (supports null scaffoldId → random)
//             const { file, domain } = await agent.Domains.visualize(scaffoldId, category);
    
//             const resolvedKey = this.getDomainCacheKey(domain.scaffoldId!, category);
    
//             runInAction(() => {
//                 this.updateDomainCache(resolvedKey, {mesh: file, domain: domain})

//                 if (this.domainMeshUrl) {
//                     URL.revokeObjectURL(this.domainMeshUrl);
//                     this.domainMeshUrl = null;
//                 }
    
//                 this.domainMesh = file;
//                 this.domainMeshUrl = URL.createObjectURL(file);
//                 this.domain = domain;
//                 this.isFetchingDomain = false;
//             });
    
//             return domain.scaffoldId;
    
//         } catch (error) {
//             runInAction(() => {
//                 this.clearDomainMesh();
//             });
//             return undefined;
//         }
//     };

// clearDomainMesh = () => {
//     if (this.domainMeshUrl) {
//         URL.revokeObjectURL(this.domainMeshUrl);
//         this.domainMeshUrl = null;
//     }
//     this.domainMesh = null;
//     this.domain = null;
//     this.isFetchingDomain = false;
// };

export default class DomainStore {
	domainMesh: Blob | null = null; // Store .glb file
    domain: Domain | null = null; // Store domain
    domainMeshUrl: string | null = null;
	isFetchingDomain: boolean = false;
    cacheLimit: number = 3;
    domainMetadata: DomainMetadata | null = null;
    // domainCache: Map<number, { mesh: Blob, metadata: Domain }> = new Map(); // Caching up to 3 domains
    // type DomainCacheKey = string; // e.g., "123|0" for scaffoldId 123 and category 0
    domainCache: Map<string, { mesh: Blob; domain: Domain; }> = new Map();
    domainMetadataCache: Map<number, object> = new Map();

    activeDomains: Record<number, Domain | null> = {};
    activeDomainUrls: Record<number, string | null> = {};
    activeDomainMeshes: Record<number, Blob | null> = {};
    activeDomainMetadata: Record<number, DomainMetadata | null> = {};

	constructor() {
		makeAutoObservable(this);
        this.activeDomains[0] = null;
        this.activeDomains[1] = null;
        this.activeDomainUrls[0] = null;
        this.activeDomainUrls[1] = null;
        this.activeDomainMeshes[0] = null;
        this.activeDomainMeshes[1] = null;
        this.activeDomainMetadata[0] = null;
        this.activeDomainMetadata[1] = null;
	}

    getDomainCacheKey = (scaffoldId: number, category: number): string => {
        return `${scaffoldId}|${category}`;
    };

    visualizeDomain = async (
        scaffoldId?: number | null, 
        category: number = 0,
        forceRefresh: boolean = false
    ): Promise<number | undefined> => {
        try {
            this.isFetchingDomain = true;

            // Try cache first
            if (scaffoldId != null) {
                const key = this.getDomainCacheKey(scaffoldId, category);
                if (!forceRefresh && this.domainCache.has(key)) {
                    const cached = this.domainCache.get(key)!;

                    runInAction(() => {
                        const oldUrl = this.activeDomainUrls[category];
                        const newUrl = URL.createObjectURL(cached.mesh);

                        this.activeDomains[category] = cached.domain;
                        this.activeDomainMeshes[category] = cached.mesh;
                        this.activeDomainUrls[category] = newUrl;

                        if (oldUrl && oldUrl !== newUrl) {
                            setTimeout(() => URL.revokeObjectURL(oldUrl), 1000);
                        }

                        this.isFetchingDomain = false;
                    });

                    return cached.domain.scaffoldId;
                }
            }

            // Fetch from API
            const { file, domain } = await agent.Domains.visualize(scaffoldId, category);
            const resolvedKey = this.getDomainCacheKey(domain.scaffoldId!, category);

            runInAction(() => {
                this.updateDomainCache(resolvedKey, { mesh: file, domain });

                const oldUrl = this.activeDomainUrls[category];
                const newUrl = URL.createObjectURL(file);

                this.activeDomains[category] = domain;
                this.activeDomainMeshes[category] = file;
                this.activeDomainUrls[category] = newUrl;

                if (oldUrl && oldUrl !== newUrl) {
                    setTimeout(() => URL.revokeObjectURL(oldUrl), 1000);
                }

                this.isFetchingDomain = false;
            });

            return domain.scaffoldId;
        } catch (error) {
            console.error(error);
            runInAction(() => {
                this.activeDomains[category] = null;
                this.activeDomainUrls[category] = null;
                this.activeDomainMeshes[category] = null;
                this.isFetchingDomain = false;
            });
            return undefined;
        }
    };

    updateDomainCache(key: string, entry: {mesh: Blob, domain: Domain }) {
        this.domainCache.set(key, entry);
    
        // Evict oldest if needed
        if (this.domainCache.size > this.cacheLimit) {
            const oldestKey = this.domainCache.keys().next().value;
            if (typeof oldestKey === 'string') {
                this.domainCache.delete(oldestKey);
            }
        }
    }

    updateDomainMetadataCache(key: number, metadata: object) {
        this.domainMetadataCache.set(key, metadata);
    
        // Evict oldest if needed
        if (this.domainMetadataCache.size > this.cacheLimit) {
            const oldestKey = this.domainMetadataCache.keys().next().value;
            if (typeof oldestKey === 'number') {
                this.domainMetadataCache.delete(oldestKey);
            }
        }
    }

    getDomainMetadata = async (category: number, domainId?: number): Promise<any> => {
        if (!domainId) return;

        if (this.domainMetadataCache.has(domainId)) {
            const metadata = this.domainMetadataCache.get(domainId);
            runInAction(() => {
                this.domainMetadata = metadata as DomainMetadata;
                this.activeDomainMetadata[category] = metadata as DomainMetadata;
            });
            return metadata;
        }

        try {
            const response = await agent.Domains.getDomainMetadata(domainId);
            runInAction(() => {
                if (response.data) {
                    this.updateDomainMetadataCache(domainId, response.data);
                    this.activeDomainMetadata[category] = response.data;
                    this.domainMetadata = response.data;
                }
            });
            return response.data;
        } catch (error) {
            console.error(error);
            runInAction(() => {
                this.activeDomainMetadata[category] = null;
            });
        }
    };

    getActiveDomain = (category: number): Domain | null => this.activeDomains[category] ?? null;
    getActiveMeshUrl = (category: number): string | null => this.activeDomainUrls[category] ?? null;
    getActiveMetadata = (category: number): DomainMetadata | null => this.activeDomainMetadata[category] ?? null;

    clearDomainMesh = (category: number) => {
        const url = this.activeDomainUrls[category];
        if (url) URL.revokeObjectURL(url);

        this.activeDomainUrls[category] = null;
        this.activeDomainMeshes[category] = null;
        this.activeDomains[category] = null;
        this.activeDomainMetadata[category] = null;
    };
    
    uploadDomainMesh = async (
        scaffoldId: number, 
        file: File,
        category: number,
        voxelSize?: number,
        domainSize?: string,
        metadataFile?: File | null,
    ) => {
        try {
            const formData = new FormData();
            formData.append("ScaffoldId", scaffoldId.toString());
            formData.append("Category", category.toString());
            formData.append("MeshFile", file);

            if (voxelSize) formData.append("VoxelSize", voxelSize.toString());
            if (domainSize) formData.append("DomainSize", domainSize);
            if (metadataFile) formData.append("MetadataFile", metadataFile);

            const response = await agent.Domains.createDomain(formData);

            if (response.statusCode === 201) {
                console.log("Mesh file uploaded successfully:", response.data);
                await this.visualizeDomain(scaffoldId, category, true); // Refresh visualization
            } else {
                console.error("Error uploading mesh file:", response.message);
            }
        } catch (error) {
            console.error("Failed to upload domain mesh", error);
        }
    };
}