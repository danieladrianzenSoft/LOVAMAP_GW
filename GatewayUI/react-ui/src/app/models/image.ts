export interface Image {
	id: number;
    scaffoldGroupId: number;
    scaffoldId: number;
    uploaderId: number;
    url: string;
    file: File;
    publicId: string;
    category: string;
    isThumbnail: boolean;
}

export interface ImageToCreate {
    scaffoldGroupId: number;
    scaffoldId?: number | null;
    file: File;
    category?: ImageCategory | null;
}

export interface ImageToUpdate {
    id: number;
    category?: string;
    isThumbnail: boolean;
    scaffoldGroupId: number;
    scaffoldId?: number | null;
}

export enum ImageCategory {
    Particles = 0,
    ExteriorPores = 1,
    InteriorPores = 2,
    ParticleSizeDistribution = 3,
    Other = 4
}