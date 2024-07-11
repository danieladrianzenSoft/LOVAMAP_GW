export interface ParticlePropertyGroup {
    shape: string;
    stiffness: string;
    friction: string;
    dispersity: string;
    sizeDistributionType: string;
    meanSize: number;
    standardDeviationSize: number;
    proportion: number;
    sizeDistribution: any[];
}

// export interface ParticlePropertyGroupToCreate {
//     shape: string;
//     stiffness: string;
//     friction: string;
//     dispersity: string;
//     sizeDistributionType: string;
//     meanSize: number;
//     standardDeviationSize: number;
//     proportion: number;
//     sizeDistribution: any[];
// }