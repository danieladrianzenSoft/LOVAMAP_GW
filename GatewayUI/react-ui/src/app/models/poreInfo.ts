export interface PoreInfo {
	scaffoldGroupId: number;
	scaffoldId: number;
	poreVolume: string;
	poreSurfaceArea: string;
	poreAspectRatio: string;
	poreLongestLength: string;
}

export interface PoreInfoForScaffoldGroup {
  scaffoldGroupId: number;
  scaffolds: PoreInfoForScaffold[];
}

export interface PoreInfoForScaffold {
    scaffoldId: number;
    poreVolume?: number[];
    poreSurfaceArea?: number[];
    poreLongestLength?: number[];
    poreAspectRatio?: number[];
}
