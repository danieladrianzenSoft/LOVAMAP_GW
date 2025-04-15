import * as THREE from 'three';

export interface HistoryAction {
	type: 'SELECT' | 'UNSELECT' | 'SWITCH' |  'HIDE' | 'SHOW' | 'SHOW_ALL';
	particleId: string;
	previousState: { 
		material?: THREE.Material; 
		visible?: boolean;
		mesh?: THREE.Mesh;
		hiddenParticles?: string[];
	};
}