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

export interface DescriptorValue {
  descriptorTypeId: number;
  values: number[];
}

export interface DescriptorSeedResult {
  attempted: number;
  succeeded: number;
  failedScaffoldIds: number[];
}