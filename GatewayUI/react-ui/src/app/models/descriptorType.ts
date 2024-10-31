export interface DescriptorType {
	id: number;
    name: string;
    description: string;
    imageUrl: string;
    label: string;
	category: string;
    unit: string;
    dataType: string;
    publication: string;
}

export interface GroupedDescriptorTypes {
    [key: string]: DescriptorType[];
}

export interface DisplayNameMap {
    [key: string]: string | undefined;
}

export const displayNameMap: DisplayNameMap = {
    Global: "GLOBAL",
    Pore: "PORE",
    Other: "OTHER",
    // Add other mappings as needed
};
