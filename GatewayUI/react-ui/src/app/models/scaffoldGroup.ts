import { InputGroup, InputGroupToCreate } from "./inputGroup";
import { Scaffold, ScaffoldToCreate } from "./scaffold";
import { Image } from "./image";

export interface ScaffoldGroup {
    id: number;
    name: string;
    comments: string;
    createdAt:  string;
    isSimulated: boolean;
    inputs: InputGroup;
    numReplicates: number;
    tags: string[];
    scaffolds: Scaffold[];
    scaffoldIds: number[];
    scaffoldIdsWithDomains: number[];
    images: Image[];
}

export interface ScaffoldGroupToCreate {
    name: string;
    isSimulated: boolean;
    comments: string;
    inputGroup: InputGroupToCreate;
    scaffolds: ScaffoldToCreate[];
}

export interface ScaffoldGroupMatch {
    scaffoldGroupId: number;
    name: string;
    matchScore: number;
    differences: any;
    details: ScaffoldGroup;
}