import { ParticlePropertyGroup } from "./particlePropertyGroup";

export interface InputGroup {
    dx: number;
    numVoxels: number;
    containerShape: string;
    containerSize: number;
    isAnisotropic: boolean;
    particles: ParticlePropertyGroup[];
}

export interface InputGroupToCreate {
    dx: number;
    numVoxels: number;
    containerShape: string;
    containerSize: number;
    isAnisotropic: boolean;
    particlePropertyGroups: ParticlePropertyGroup[];
}