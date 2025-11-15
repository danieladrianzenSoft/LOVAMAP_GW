import { Tag } from "./tag";

export interface ScaffoldGroupFilter {
	selectedTags?: Tag[], 
	sizeIds?: number[],
	publicationId?: number | null,
	publicationDatasetId?: number | null,
	restrictToPublicationDataset: boolean | null,
}