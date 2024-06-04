export interface Tag {
	id: number;
	name: string;
	referenceProperty: string;
}

export interface GroupedTags {
    [key: string]: Tag[];
}

export interface DisplayNameMap {
    [key: string]: string | undefined;
}

export const displayNameMap: DisplayNameMap = {
    shape: "PARTICLE SHAPE",
    stiffness: "PARTICLE STIFFNESS",
    dispersity: "PARTICLE DISPERSITY",
    // Add other mappings as needed
};