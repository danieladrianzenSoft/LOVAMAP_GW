
import { Descriptor } from "./descriptor";

export interface Scaffold {
    id: number;
    replicateNumber: number;
    globalDescriptors: Descriptor[];
    poreDescriptors: Descriptor[];
    otherDescriptors: Descriptor[];
}