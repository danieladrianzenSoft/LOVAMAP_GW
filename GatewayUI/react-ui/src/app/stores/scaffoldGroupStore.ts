import { makeAutoObservable, runInAction } from "mobx";
import agent from "../api/agent";
import { Tag } from "../models/tag";
import { ScaffoldGroup, ScaffoldGroupToCreate } from "../models/scaffoldGroup";
import { Scaffold } from "../models/scaffold";
import { Image, ImageToCreate, ImageToUpdate } from "../models/image";

export default class ScaffoldGroupStore {
	scaffoldGroups: ScaffoldGroup[] = [];
	uploadedScaffoldGroups: ScaffoldGroup[] = [];

	constructor() {
		makeAutoObservable(this)
	}

	setUploadedScaffoldGroups(groups: any[]) {
		this.uploadedScaffoldGroups = groups;
	}

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

	getDetailedScaffoldGroupsForExperiment = async (selectedScaffoldGroupIds?: number[], selectedDescriptorIds?: number[]) => {

		try {
			let queryParams = ''
			if (selectedScaffoldGroupIds!= null){
				queryParams = queryParams + selectedScaffoldGroupIds.map(num => `scaffoldGroupIds=${num}`).join('&');
			} 
			if (queryParams !== '')
			{
				queryParams = queryParams + '&';
			}
			if (selectedDescriptorIds != null)
			{
				queryParams = queryParams + selectedDescriptorIds.map(num => `descriptorIds=${num}`).join('&')
			}
			if (queryParams !== '')
			{
				queryParams = '?' + queryParams
			}

			console.log(queryParams);
			const response = await agent.ScaffoldGroups.getDetailedForExperiment(queryParams);

			// runInAction(() => {
			// 	this.scaffoldGroups = response.data
			// })
			
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