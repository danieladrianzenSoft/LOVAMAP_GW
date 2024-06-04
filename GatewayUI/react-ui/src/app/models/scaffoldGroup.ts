import { InputGroup } from "./inputGroup";
import { Scaffold } from "./scaffold";

export interface ScaffoldGroup {
    id: number;
    name: string;
    isSimulated: boolean;
    inputs: InputGroup;
    numReplicates: number;
    tags: string[];
    scaffolds: Scaffold[];
}