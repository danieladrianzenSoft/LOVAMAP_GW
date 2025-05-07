import { ScaffoldGroup } from "./scaffoldGroup";
import { Tag } from "./tag";

export interface AiScaffoldGroupSearch {
    selectedTags: Tag[];
	selectedParticleSizes: number[];
	scaffoldGroups: ScaffoldGroup[];
}