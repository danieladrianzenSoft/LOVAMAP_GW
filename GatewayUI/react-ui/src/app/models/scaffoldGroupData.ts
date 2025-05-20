// import { InputGroup, InputGroupToCreate } from "./inputGroup";
// import { Scaffold, ScaffoldToCreate } from "./scaffold";
// import { Image } from "./image";

import { PoreInfoForScaffold } from "./poreInfo";
import { ScaffoldGroup } from "./scaffoldGroup";

export interface ScaffoldGroupData {
	scaffoldGroupId: number;
	scaffoldGroup: ScaffoldGroup;
	poreDescriptors: PoreInfoForScaffold[];
}