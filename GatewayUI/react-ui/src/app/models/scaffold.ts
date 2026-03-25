
import { Descriptor, DescriptorToCreate } from "./descriptor";

export interface Scaffold {
    id: number;
    replicateNumber: number;
    comments?: string;
    globalDescriptors: Descriptor[];
    poreDescriptors: Descriptor[];
    otherDescriptors: Descriptor[];
}

export interface ScaffoldToCreate {
    comments?: string;
    globalDescriptors: DescriptorToCreate[];
    poreDescriptors: DescriptorToCreate[];
    otherDescriptors: DescriptorToCreate[];
}

export interface ScaffoldWithMissingThumbnail {
    scaffoldId: number;
    scaffoldGroupId: number;
}
