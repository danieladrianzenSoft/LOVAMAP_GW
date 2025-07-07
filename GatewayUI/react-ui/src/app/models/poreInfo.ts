import { Descriptor, DescriptorValue } from "./descriptor";

export interface PoreInfo {
	scaffoldGroupId: number;
	scaffoldId: number;
	poreVolume: string;
	poreSurfaceArea: string;
	poreAspectRatio: string;
	poreLongestLength: string;
}

export interface PoreInfoForScaffold {
  scaffoldId: number;
  descriptors: DescriptorValue[];
}

export interface PoreInfoForScaffoldGroup {
  scaffoldGroupId: number;
  scaffolds: PoreInfoForScaffold[];
  descriptorTypes: Descriptor[];
}
