export interface ContentPageSummary {
	id: number;
	slug: string;
	title: string;
	area: string;
	description: string | null;
	comingSoon: boolean;
	sortOrder: number;
}

export interface ContentSection {
	id: number;
	title: string | null;
	body: string;
	sortOrder: number;
}

export interface ContentPageDetail {
	id: number;
	slug: string;
	title: string;
	area: string;
	description: string | null;
	comingSoon: boolean;
	sortOrder: number;
	sections: ContentSection[];
}

export interface ContentPageToCreate {
	slug: string;
	title: string;
	area: string;
	description?: string;
	comingSoon: boolean;
	sortOrder: number;
	sections: ContentSectionToCreate[];
}

export interface ContentSectionToCreate {
	title?: string;
	body: string;
	sortOrder: number;
}

export interface ContentPageToUpdate {
	title?: string;
	description?: string;
	comingSoon?: boolean;
	sortOrder?: number;
	area?: string;
}

export interface ContentSectionToUpdate {
	title?: string;
	body?: string;
	sortOrder?: number;
}

export interface ReorderSections {
	sectionIds: number[];
}

export interface ReorderPages {
	pageIds: number[];
}
