import { InputGroup, InputGroupToCreate } from "./inputGroup";
import { Scaffold, ScaffoldToCreate } from "./scaffold";

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
}

export interface ScaffoldGroupToCreate {
    name: string;
    isSimulated: boolean;
    comments: string;
    inputGroup: InputGroupToCreate;
    scaffolds: ScaffoldToCreate[];
}
