import * as THREE from 'three';

export type HistoryAction =
	|
{
		type: 'SELECT' | 'UNSELECT';
		category: number;
		particleId: string;
		previousState: {
			material: THREE.Material;
			visible: boolean;
			mesh: THREE.Mesh;
		};
}
 	| 
{
	type: 'SWITCH';
	category: number;
	particleId: string;
	previousState: {
		material: THREE.Material;
		visible: boolean;
		mesh: THREE.Mesh;
	};
	newState?: {
		id: string;
		mesh: THREE.Mesh;
		material: THREE.Material;
	};
}
  	| 
{
	type: 'HIDE' | 'SHOW';
	category: number;
	particleId: string;
	previousState: {
		visible: boolean;
	};
}
  	| 
{
	type: 'SHOW_ALL';
	category: number;
	previousState: {
		hiddenIds: Set<string>;
	};
}
  	| 
{
	type: 'TOGGLE_MESH_VISIBILITY';
	category: number;
	previousState: boolean; // previous value of showParticles/showPores
}
  	| 
{
	type: 'TOGGLE_EDGE_PORES';
	category: number;
	previousState: boolean; // previous value of areEdgePoresHidden
};