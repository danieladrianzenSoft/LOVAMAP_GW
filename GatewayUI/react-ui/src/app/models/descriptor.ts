export interface Descriptor {
    descriptorTypeId: number;
    name: string;
    label: string;
    unit: string;
    values: string;
}

export interface DescriptorToCreate {
    name: string;
    value: number | null;
    values: number[] | null;
}