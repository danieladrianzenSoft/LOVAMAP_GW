import { ParticlePropertyGroup } from "./particlePropertyGroup";

export interface InputGroup {
    containerShape: string;
    containerSize: number;
    packingConfiguration: string;
    particles: ParticlePropertyGroup[];
    sizeDistribution: number[];
    isSimulated: boolean;
    dx?: number | null;
}

export interface InputGroupToCreate {
    containerShape: string;
    containerSize: number;
    packingConfiguration: string;
    particlePropertyGroups: ParticlePropertyGroup[];
}

export interface InputGroupForMatch {
    containerShape: string;
    containerSize: number;
    packingConfiguration: string;
    Particles: ParticlePropertyGroup[];
}

// Argument of type '{ ContainerShape: any; ContainerSize: any; PackingConfiguration: any; Particles: any; SizeDistribution: any; IsSimulated: any; }' is not assignable to parameter of type 'InputGroup'.
//   Type '{ ContainerShape: any; ContainerSize: any; PackingConfiguration: any; Particles: any; SizeDistribution: any; IsSimulated: any; }' is missing the following properties from type 'InputGroup': containerShape, containerSize, packingConfiguration, particles, and 2 more.