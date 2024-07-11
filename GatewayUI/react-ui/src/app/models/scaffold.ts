
import { Descriptor, DescriptorToCreate } from "./descriptor";

export interface Scaffold {
    id: number;
    replicateNumber: number;
    globalDescriptors: Descriptor[];
    poreDescriptors: Descriptor[];
    otherDescriptors: Descriptor[];
}

export interface ScaffoldToCreate {
    globalDescriptors: DescriptorToCreate[];
    poreDescriptors: DescriptorToCreate[];
    otherDescriptors: DescriptorToCreate[];
}