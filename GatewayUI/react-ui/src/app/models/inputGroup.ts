import { ParticlePropertyGroup } from "./particlePropertyGroup";

export interface InputGroup {
    containerShape: string;
    containerSize: number;
    packingConfiguration: string;
    particles: ParticlePropertyGroup[];
    sizeDistribution: number[];
}

export interface InputGroupToCreate {
    containerShape: string;
    containerSize: number;
    packingConfiguration: string;
    particlePropertyGroups: ParticlePropertyGroup[];
}