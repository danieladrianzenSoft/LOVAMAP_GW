import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { Tag } from "../models/tag";
import { ScaffoldGroup, ScaffoldGroupToCreate } from "../models/scaffoldGroup";
import { Image, ImageToCreate, ImageToUpdate } from "../models/image";
import History from "../helpers/History";
import { ScaffoldWithMissingThumbnail } from "../models/scaffold";
import { BatchOperationResult } from "../models/batchOperationResult";
import { ScaffoldGroupData } from "../models/scaffoldGroupData";
import { InputGroup } from "../models/inputGroup";
import { ScaffoldGroupFilter } from "../models/scaffoldGroupFilter";

export default class ScaffoldGroupStore {
	scaffoldGroups: ScaffoldGroup[] = [];
	uploadedScaffoldGroups: ScaffoldGroup[] = [];
	uploadProgress: number | null = null;
	selectedScaffoldGroup: ScaffoldGroup | null = null;
	defaultScaffoldGroupId: number = 55;

	selectedTagNames: string[] = [];
	selectedParticleSizeIds: number[] = [];
	selectedPublicationDatasetId: number | null = null;
	selectedPublicationId: number | null = null;
	restrictToPublicationDataset: boolean = false;
	isFetchingScaffoldGroup: boolean = false;
	groupedSelectedTags: { [key: string]: Tag[] } = {};

	constructor() {
		makeAutoObservable(this)
	}

	getIds = async(): Promise<number[]> => {
		try {
			const apiResponse = await agent.ScaffoldGroups.getAllIds();
			const ids = apiResponse.data;
			return ids;
		} catch (error) {
			console.error("Error fetching scaffold group ids", error);
			return [];
		}
	}

	resetNamesAndComments = async(ids: number[]): Promise<BatchOperationResult | null> => {
		try {
			const idsToReset: {scaffoldGroupIds: number[]} = {scaffoldGroupIds: ids};
			const response = await agent.ScaffoldGroups.resetNameAndComments(idsToReset);
			return response.data;
		} catch (error) {
			console.error('Error resetting scaffold group names:', error);
			return null;
		}
	}

	setUploadedScaffoldGroups(groups: any[]) {
		this.uploadedScaffoldGroups = groups;
	}

	loadGroupForScaffoldId = async (scaffoldId: number): Promise<ScaffoldGroup | null> => {
		if (this.selectedScaffoldGroup?.scaffoldIds.includes(scaffoldId)) {
			return this.selectedScaffoldGroup;
		}
	
		const group = this.scaffoldGroups.find(g => g.scaffoldIds.includes(scaffoldId)) 
			|| this.uploadedScaffoldGroups.find(g => g.scaffoldIds.includes(scaffoldId)) 
			|| await this.getScaffoldGroupSummaryByScaffoldId(scaffoldId);
	
		if (group) {
			return group;
		}
	
		return null;
	}

	navigateToVisualization = async (
		scaffoldGroup: ScaffoldGroup | null, 
		scaffoldId?: number
	) => {
		if (!scaffoldGroup && scaffoldId) {
			// Try to find scaffold group containing this scaffold ID
			let foundGroup = this.scaffoldGroups.find(g => g.scaffoldIds.includes(scaffoldId)) 
				|| this.uploadedScaffoldGroups.find(g => g.scaffoldIds.includes(scaffoldId)) 
				|| null;
	
			if (!foundGroup) {
				// If not in memory, fetch from server
				// foundGroup = await this.getScaffoldGroupSummary(scaffoldId);
				foundGroup = await this.getScaffoldGroupSummaryByScaffoldId(scaffoldId);
			}
	
			if (foundGroup) {
				this.setSelectedScaffoldGroup(foundGroup);
				// History.push(`/visualize/${scaffoldId}`);
				return; // Don't redirect — let the page handle 404 mesh gracefully
			}
	
			// Fallback — could not find scaffoldGroup for this scaffoldId
			console.warn(`No scaffold group found for scaffoldId ${scaffoldId}`);
			return; // Still don't redirect — show error UI instead
		}
	
		if (!scaffoldGroup && !scaffoldId) {
			// Total fallback behavior
			const fallbackGroup = 
				this.scaffoldGroups.find(g => g.id === this.defaultScaffoldGroupId) ||
				this.uploadedScaffoldGroups.find(g => g.id === this.defaultScaffoldGroupId) ||
				await this.getScaffoldGroupSummary(this.defaultScaffoldGroupId);
	
			if (fallbackGroup) {
				this.setSelectedScaffoldGroup(fallbackGroup);
				History.push(`/visualize/${fallbackGroup.scaffoldIdsWithDomains[0] || fallbackGroup.scaffoldIds[0]}`);
			} else {
				History.push("/explore");
			}
			return;
		}
	
		// If both group and ID are provided
		if (scaffoldGroup && scaffoldId) {
			this.setSelectedScaffoldGroup(scaffoldGroup);
			History.push(`/visualize/${scaffoldId}`);
			return;
		}
	
		// If only scaffold group is passed, pick a scaffold from it
		if (scaffoldGroup) {
			this.setSelectedScaffoldGroup(scaffoldGroup);
			History.push(`/visualize/${scaffoldGroup.scaffoldIdsWithDomains[0] || scaffoldGroup.scaffoldIds[0]}`);
		}
	}

	setSelectedScaffoldGroup = (scaffoldGroup: ScaffoldGroup | null) => {
		this.selectedScaffoldGroup = scaffoldGroup;
	}

	getScaffoldGroupSummaryByScaffoldId = async (scaffoldId: number) => {
		try {
			this.isFetchingScaffoldGroup = true;
			const apiResponse = await agent.ScaffoldGroups.getGroupSummaryByScaffoldId(scaffoldId);
			const scaffoldGroup = apiResponse.data;
			this.setSelectedScaffoldGroup(scaffoldGroup);
			this.isFetchingScaffoldGroup = false;
			return scaffoldGroup;
		} catch (error) {
			this.isFetchingScaffoldGroup = false;
			this.setSelectedScaffoldGroup(null);
			console.error("Error fetching scaffold group by scaffoldId", error);
			return null;
		}
	}

	getScaffoldGroupSummary = async (id: any) => {
		try {
			const apiResponse = await agent.ScaffoldGroups.getSummary(id);
			const scaffoldGroup = apiResponse.data;
			return scaffoldGroup; 
		} catch (error) {
			console.error("Failed to fetch summarized scaffold group:", error);
		}
	};

	getDetailedScaffoldGroupById = async (data: any) => {
		try {
			const apiResponse = await agent.ScaffoldGroups.getDetailed(data.scaffoldGroupId);
			const scaffoldGroup = apiResponse.data;
			// runInAction(() => {
			// 	console.log("Data set in state:", scaffoldGroup);
			// 	// Here you might set this data to some observable state if needed
			// });
			return scaffoldGroup; 
		} catch (error) {
			console.error("Failed to fetch detailed scaffold group:", error);
		}
	};

	getDataForVisualization = async (scaffoldGroupId: number, descriptorTypeIds: number[]): Promise<ScaffoldGroupData | null> => {
		try {
			let queryParams = '';
			if (descriptorTypeIds.length > 0) {
				queryParams += descriptorTypeIds.map(id => `descriptorTypeIds=${id}`).join('&');
			}
			if (queryParams !== '') queryParams = '?' + queryParams;
			const apiResponse = await agent.ScaffoldGroups.getDataForVisualization(scaffoldGroupId, queryParams);
			return apiResponse.data;
		} catch (error) {
			console.error("Failed to scaffold group data:", error);
		}
		return null;
	}

	getDataForVisualizationRandom = async (descriptorTypeIds: number[]): Promise<ScaffoldGroupData | null> => {
		try {
			let queryParams = '';
			if (descriptorTypeIds.length > 0) {
				queryParams += descriptorTypeIds.map(id => `descriptorTypeIds=${id}`).join('&');
			}
			if (queryParams !== '') queryParams = '?' + queryParams;
			const apiResponse = await agent.ScaffoldGroups.getDataForVisualizationRandom(queryParams);
			return apiResponse.data;
		} catch (error) {
			console.error("Failed to fetch scaffold group data:", error);
		}
		return null;
	}

	getDetailedScaffoldGroupsForExperiment = async (
		selectedScaffoldGroupIds?: number[], selectedDescriptorIds?: number[], 	numReplicatesByGroup?: Record<number, number>
	) => {
		try {
			let queryParams = ''
			if (selectedScaffoldGroupIds!= null){
				queryParams += selectedScaffoldGroupIds.map(num => `scaffoldGroupIds=${num}`).join('&');
			} 
			if (selectedDescriptorIds != null)
			{
				if (queryParams !== '') queryParams += '&';
				queryParams = queryParams + selectedDescriptorIds.map(num => `descriptorIds=${num}`).join('&')
			}
			if (numReplicatesByGroup != null && Object.keys(numReplicatesByGroup).length > 0) {
				if (queryParams !== '') queryParams += '&';
				queryParams += Object.entries(numReplicatesByGroup)
					.map(([groupId, numReplicates]) => `numReplicatesByGroup[${groupId}]=${numReplicates}`)
					.join('&');
			}
			if (queryParams !== '') queryParams = '?' + queryParams;

			const response = await agent.ScaffoldGroups.getDetailedForExperiment(queryParams);
			
			return response.data;

		} catch (error) {
			console.error("Failed to fetch detailed scaffold groups:", error);
		}
	};

	uploadScaffoldGroup = async (scaffoldGroupToCreate: ScaffoldGroupToCreate) => {
		try {
			const apiResponse = await agent.ScaffoldGroups.uploadScaffoldGroup(scaffoldGroupToCreate);
			const scaffoldGroup = apiResponse.data;
			return scaffoldGroup;
		} catch (error) {
			console.error("Failed to create scaffold group:", error);
			return null;
		}
	}

	uploadScaffoldGroupBatchStreamed = async (
		scaffoldGroupsToCreate: ScaffoldGroupToCreate[],
		onProgress?: (pct: number) => void
	) => {
		try {
			const apiResponse = await agent.ScaffoldGroups.uploadScaffoldGroupBatchStreamed(
				scaffoldGroupsToCreate,
				onProgress
			);
			const scaffoldGroups = apiResponse.data ?? [];

			scaffoldGroups.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);

			runInAction(() => {
				this.uploadedScaffoldGroups = [...scaffoldGroups, ...this.uploadedScaffoldGroups];
			});

			return scaffoldGroups;
		} catch (err) {
			console.error("Failed to create scaffold group (streamed):", err);
			return null;
		}
	};

	uploadScaffoldGroupBatch = async (scaffoldGroupsToCreate: ScaffoldGroupToCreate[]) => {
		try {
			const apiResponse = await agent.ScaffoldGroups.uploadScaffoldGroupBatch(scaffoldGroupsToCreate);
			const scaffoldGroups = apiResponse.data;

			scaffoldGroups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

			runInAction(() => {
				this.uploadedScaffoldGroups = [...scaffoldGroups, ...this.uploadedScaffoldGroups];
			  });
			return scaffoldGroups;
		} catch (error) {
			console.error("Failed to create scaffold group:", error);
			return null;
		}
	}

	uploadScaffoldGroupBatchSmart = async (scaffoldGroupsToCreate: ScaffoldGroupToCreate[]) => {
		const estimatedBytes = new Blob([JSON.stringify(scaffoldGroupsToCreate)]).size;
		const STREAM_THRESHOLD = 25_000_000; // 25MB; tune against your limits

		if (estimatedBytes < STREAM_THRESHOLD) {
		// Use your existing non-streamed method
		return await this.uploadScaffoldGroupBatch(scaffoldGroupsToCreate);
		} else {
		// Use streamed method
		return await this.uploadScaffoldGroupBatchStreamed(scaffoldGroupsToCreate);
		}
	};

	removeUploadedScaffoldGroup = (id: number) => {
		this.uploadedScaffoldGroups = this.uploadedScaffoldGroups.filter(group => group.id !== id);
	}

	uploadImageForScaffoldGroup = async (
        scaffoldGroupId: number,
        image: ImageToCreate,
    ): Promise<Image | null> => {
        try {
            const response = await agent.ScaffoldGroups.uploadScaffoldGroupImage(scaffoldGroupId, image);
			return response.data;
        } catch (error) {
            console.error('Error uploading image for scaffold group:', error);
			return null;
        }
    };

	getImageIdsForDeletion = async (category?: number | null, includeThumbnails?: boolean ): Promise<number[]> => {
		try {
			let queryParams = ''
			if (category !== null && category !== undefined){
				queryParams += `category=${category.toString()}`;
			} 
			if (includeThumbnails !== null && includeThumbnails !== undefined)
			{
				if (queryParams !== '') queryParams += '&';
				queryParams += `includeThumbnails=${includeThumbnails.toString()}`;
			}
			if (queryParams !== '') queryParams = '?' + queryParams;

			const response = await agent.ScaffoldGroups.getImageIdsForDeletion(queryParams);
			return response.data;
		} catch (error) {
			console.error("Error fetching deletable image IDs:", error);
			return [];
		}
	};

	deleteImages = async (ids: number[]): Promise<BatchOperationResult | null> => {
		try {
			const idsToDelete: {imageIds: number[]} = {imageIds: ids};
			const response = await agent.ScaffoldGroups.deleteImages(idsToDelete);
			return response.data;
		} catch (error) {
			console.error('Error deleting images:', error);
			return null;
		}
	};

	searchScaffoldGroups = async (searchPrompt: string) => {
		try {
			const response = await agent.ScaffoldGroups.search(searchPrompt);
			runInAction(() => {
				this.scaffoldGroups = response.data.scaffoldGroups;
	
				this.selectedParticleSizeIds = response.data.selectedParticleSizes || [];
				this.selectedTagNames = response.data.selectedTags?.map((t: Tag) => t.name) || [];
	
				// Group selected tags by referenceProperty (for useScaffoldGroupFiltering)
				const grouped: { [key: string]: Tag[] } = {};
				response.data.selectedTags?.forEach((tag: Tag) => {
					const key = tag.referenceProperty || "other";
					if (!grouped[key]) grouped[key] = [];
					grouped[key].push(tag);
				});
				this.groupedSelectedTags = grouped; // <-- add this to your store
			});
		} catch (error) {
			console.error(error);
		}
	}

	// getPublicScaffoldGroups = async (selectedTags?: Tag[] | null, sizeIds?: number[] | null) => {
	getPublicScaffoldGroups = async (filter: ScaffoldGroupFilter) => {
		try {
			const tagIds = filter.selectedTags?.map(tag => tag.id) || [];
			this.selectedTagNames = filter.selectedTags?.map(tag => tag.name) || [];
			this.selectedParticleSizeIds = filter.sizeIds || [];

			let queryParams = '';
			if (tagIds.length > 0) {
				queryParams += tagIds.map(id => `tagIds=${id}`).join('&');
			}
			if (this.selectedParticleSizeIds.length > 0) {
				if (queryParams !== '') queryParams += '&';
				queryParams += this.selectedParticleSizeIds.map(id => `particleSizes=${id}`).join('&');
			}
			if (filter.publicationId) {
				if (queryParams !== '') queryParams += '&';
				queryParams += `publicationId=${filter.publicationId}`;
			}
			if (filter.publicationDatasetId) {
				if (queryParams !== '') queryParams += '&';
				queryParams += `publicationDatasetId=${filter.publicationDatasetId}`;
			}
			if (filter.restrictToPublicationDataset) {
				if (queryParams !== '') queryParams += '&';
				queryParams += `restrictToPublicationDataset=${filter.restrictToPublicationDataset}`;
			}
			if (queryParams !== '') queryParams = '?' + queryParams;

			const response = await agent.ScaffoldGroups.getPublic(queryParams);
			runInAction(() => {
				this.scaffoldGroups = response.data;
			});
			return response.data;
		} catch (error) {
			console.error(error);
		}
	};

	// getSummarizedScaffoldGroups = async (selectedTags?: Tag[], sizeIds?: number[]) => {
	getSummarizedScaffoldGroups = async (filter: ScaffoldGroupFilter) => {
		try {
			const tagIds = filter.selectedTags?.map(tag => tag.id) || [];
			this.selectedTagNames = filter.selectedTags?.map(tag => tag.name) || [];
			this.selectedParticleSizeIds = filter.sizeIds || [];

			let queryParams = '';
			if (tagIds.length > 0) {
				queryParams += tagIds.map(id => `tagIds=${id}`).join('&');
			}
			if (this.selectedParticleSizeIds.length > 0) {
				if (queryParams !== '') queryParams += '&';
				queryParams += this.selectedParticleSizeIds.map(id => `particleSizes=${id}`).join('&');
			}
			if (filter.publicationId) {
				if (queryParams !== '') queryParams += '&';
				queryParams += `publicationId=${filter.publicationId}`;
			}
			if (filter.publicationDatasetId) {
				if (queryParams !== '') queryParams += '&';
				queryParams += `publicationDatasetId=${filter.publicationDatasetId}`;
			}
			if (filter.restrictToPublicationDataset) {
				if (queryParams !== '') queryParams += '&';
				queryParams += `restrictToPublicationDataset=${filter.restrictToPublicationDataset}`;
			}
			if (queryParams !== '') queryParams = '?' + queryParams;

			const response = await agent.ScaffoldGroups.getSummarized(queryParams);
			runInAction(() => {
				this.scaffoldGroups = response.data;
			});
			return response.data;
		} catch (error) {
			console.error(error);
		}
	};

	getScaffoldGroupMatches = async (group: InputGroup) => {
		try {
			const response = await agent.ScaffoldGroups.getScaffoldGroupMatches(group);
			// runInAction(() => {
			// 	console.log(response);
			// });
			return response.data;
		} catch (error) {
			console.error(error);
		}
	};

	isExactMatch = (group: ScaffoldGroup): boolean => {
		// Match all selected tag *names*
		const groupTagSet = new Set(group.tags || []);
		const tagsMatch = this.selectedTagNames.every(name => groupTagSet.has(name));

		// Match all selected particle sizes (±9 window)
		const sizesMatch = this.selectedParticleSizeIds.every(selectedSize =>
			group.inputs?.particles?.some(p =>
				Math.abs(p.meanSize - selectedSize) <= 9
			)
		);

		return tagsMatch && sizesMatch;
	};

	get segmentedScaffoldGroups() {
		return {
			exact: this.scaffoldGroups.filter(sg => this.isExactMatch(sg)),
			related: this.scaffoldGroups.filter(sg => !this.isExactMatch(sg)),
		};
	}

	removeFilterTag = (tagText: string) => {
		// Check if it's a particle size tag, like "150um"
		if (tagText.endsWith("um")) {
			const numberPart = parseInt(tagText.replace("um", ""), 10);
	
			if (!isNaN(numberPart) && this.selectedParticleSizeIds.includes(numberPart)) {
				this.selectedParticleSizeIds = this.selectedParticleSizeIds.filter(id => id !== numberPart);
				return;
			}
		}
	
		// Otherwise assume it's a regular tag name
		this.selectedTagNames = this.selectedTagNames.filter(name => name !== tagText);
	};

	getUploadedScaffoldGroups = async () => {
		try {
			const response = await agent.ScaffoldGroups.getUploadedScaffoldGroups();

			runInAction(() => {
				this.uploadedScaffoldGroups = response.data;
			})

			return response.data;
		} catch (error) {
			console.error(error);
		}
	}

	deleteScaffoldGroup = async (id: number) => {
		try {
			const response = await agent.ScaffoldGroups.delete(id);
			return response.data;
		} catch (error) {
			console.error(error);
		}
	}

	updateImage = async(scaffoldGroupId: number, image: ImageToUpdate) => {
		try {
			const response = await agent.ScaffoldGroups.updateImage(scaffoldGroupId, image)
			return response.data;
		} catch (error) {
			console.error(error);
		}
	}

	deleteImage = async(scaffoldGroupId: number, imageId: number) => {
		try {
			const response = await agent.ScaffoldGroups.deleteImage(scaffoldGroupId, imageId)
			return response.data;
		} catch (error) {
			console.error(error);
		}
	}

	getScaffoldsWithMissingThumbnails = async(): Promise<ScaffoldWithMissingThumbnail[]> => {
		try {
			const response = await agent.ScaffoldGroups.getScaffoldsWithMissingThumbnails()
			return response.data ?? [];
		} catch (error) {
			console.error(error);
			return [];
		}
	}

	
}