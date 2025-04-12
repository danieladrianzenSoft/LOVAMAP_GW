import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { Tag } from "../models/tag";
import { ScaffoldGroup, ScaffoldGroupToCreate } from "../models/scaffoldGroup";
import { Image, ImageToCreate, ImageToUpdate } from "../models/image";
import History from "../helpers/History";

export default class ScaffoldGroupStore {
	scaffoldGroups: ScaffoldGroup[] = [];
	uploadedScaffoldGroups: ScaffoldGroup[] = [];
	selectedScaffoldGroup: ScaffoldGroup | null = null;
	defaultScaffoldGroupId: number = 55;

	constructor() {
		makeAutoObservable(this)
	}

	setUploadedScaffoldGroups(groups: any[]) {
		this.uploadedScaffoldGroups = groups;
	}

	// navigateToVisualization = async (scaffoldGroup: ScaffoldGroup | null, scaffoldId?: number) => {
	// 	if (!scaffoldGroup) {
	// 		console.warn("No scaffold group provided. Redirecting to default.");

	// 		const foundGroup = 
	// 			this.scaffoldGroups.find(g => g.id === this.defaultScaffoldGroupId) || 
	// 			this.uploadedScaffoldGroups.find(g => g.id === this.defaultScaffoldGroupId);

	// 		if (foundGroup) {
	// 			this.setSelectedScaffoldGroup(foundGroup);
	// 			History.push(`/visualize/${foundGroup.scaffoldIdsWithDomains[0] || foundGroup.scaffoldIds[0]}`);
	// 			return;
	// 		}

	// 		const scaffoldGroup = await this.getScaffoldGroupSummary(this.defaultScaffoldGroupId);

	// 		if (scaffoldGroup) {
	// 			this.setSelectedScaffoldGroup(scaffoldGroup);
	// 			History.push(`/visualize/${scaffoldGroup.scaffoldIdsWithDomains[0] || scaffoldGroup.scaffoldIds[0]}`);
	// 			return;
	// 		}

	// 		History.push("/explore"); // Redirect to generic explore page
	// 		return;
	// 	}

	// 	if (scaffoldId) {
	// 		if (scaffoldGroup.scaffoldIds.includes(scaffoldId)) {
	// 			// if (this.selectedScaffoldGroup?.id === scaffoldGroup.id) {
	// 			// 	return;
	// 			// }

	// 			this.setSelectedScaffoldGroup(scaffoldGroup);
	// 			History.push(`/visualize/${scaffoldId}`);
	// 			return;
	// 		} else {
	// 			console.warn(`Scaffold ID ${scaffoldId} not found in ScaffoldGroup ${scaffoldGroup.id}.`);
	// 		}
	// 	}

	// 	this.setSelectedScaffoldGroup(scaffoldGroup);
		
	// 	if (scaffoldGroup.scaffoldIdsWithDomains.length > 0) {
	// 		History.push(`/visualize/${scaffoldGroup.scaffoldIdsWithDomains[0]}`);
	// 	} else {
	// 		History.push(`/visualize/${scaffoldGroup.scaffoldIds[0]}`);
	// 		console.warn("No available meshes for visualization.");
	// 	}
	// }

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
			const apiResponse = await agent.ScaffoldGroups.getGroupSummaryByScaffoldId(scaffoldId);
			const scaffoldGroup = apiResponse.data;
			return scaffoldGroup;
		} catch (error) {
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

	uploadImageForScaffoldGroup = async (
        scaffoldGroupId: number,
        image: ImageToCreate,
        imageType?: string
    ): Promise<Image | null> => {
        try {
            // const formData = new FormData();
            // formData.append('image', imageFile);
            // if (imageType) formData.append('imageType', imageType);

            const response = await agent.ScaffoldGroups.uploadScaffoldGroupImage(scaffoldGroupId, image);
			return response.data;
            // if (response.statusCode === 200) {
            //     console.log('Image uploaded successfully');
            // } else {
            //     console.error('Image upload failed:', response);
            // }
        } catch (error) {
            console.error('Error uploading image for scaffold group:', error);
			return null;
        }
    };


	getPublicScaffoldGroups = async (selectedTags?: Tag[] | null, sizeIds?: number[] | null) => {
		try {
			let queryParams = ''
			if (selectedTags!= null){
				queryParams = queryParams + selectedTags.map(tag => `tagIds=${tag.id}`).join('&');
			} 
			if (queryParams !== '')
			{
				queryParams = queryParams + '&';
			}
			if (sizeIds != null)
			{
				queryParams = queryParams + sizeIds.map(id => `particleSizes=${id}`).join('&')
			}
			if (queryParams !== '')
			{
				queryParams = '?' + queryParams
			}
			const response = await agent.ScaffoldGroups.getPublic(queryParams);

			runInAction(() => {
				this.scaffoldGroups = response.data
			})
			
			return response.data;

		} catch (error) {
			console.error(error);
		}
	}

	getSummarizedScaffoldGroups = async (selectedTags?: Tag[], sizeIds?: number[]) => {
		try {
			let queryParams = ''
			if (selectedTags!= null){
				queryParams = queryParams + selectedTags.map(tag => `tagIds=${tag.id}`).join('&');
			} 
			if (queryParams !== '')
			{
				queryParams = queryParams + '&';
			}
			if (sizeIds != null)
			{
				queryParams = queryParams + sizeIds.map(id => `particleSizes=${id}`).join('&')
			}
			if (queryParams !== '')
			{
				queryParams = '?' + queryParams
			}
			const response = await agent.ScaffoldGroups.getSummarized(queryParams);

			runInAction(() => {
				this.scaffoldGroups = response.data
			})

			return response.data;
		} catch (error) {
			console.error(error);
		}
	}

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

	
}