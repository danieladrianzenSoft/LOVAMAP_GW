import { useState } from "react";
import * as THREE from 'three';
import { HistoryAction } from "../../models/historyAction";

interface UndoManagerOptions {
  selectedByCategory: Record<number, { id: string; mesh: THREE.Mesh } | null>;
  setSelectedByCategory: React.Dispatch<React.SetStateAction<Record<number, { id: string; mesh: THREE.Mesh } | null>>>;

  hiddenByCategory: Record<number, Set<string>>;
  setHiddenByCategory: React.Dispatch<React.SetStateAction<Record<number, Set<string>>>>;

  setShowParticles: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPores: React.Dispatch<React.SetStateAction<boolean>>;
  setAreEdgePoresHidden: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useUndoManager({
  selectedByCategory,
  setSelectedByCategory,
  hiddenByCategory,
  setHiddenByCategory,
  setShowParticles,
  setShowPores,
  setAreEdgePoresHidden,
}: UndoManagerOptions) {
	const [history, setHistory] = useState<HistoryAction[]>([]);
	const maxHistorySize = 10;

	const addToHistory = (action: HistoryAction) => {
		setHistory((prev) => {
			const updated = [...prev, action];
			return updated.length > maxHistorySize ? updated.slice(1) : updated;
		});
	};

	const clearHistory = () => {
		setHistory([]);
	};

	const undoLastAction = () => {
		setHistory((prevHistory) => {
			if (prevHistory.length === 0) return prevHistory;
			const last = prevHistory[prevHistory.length - 1];

			switch (last.type) {
				case 'SELECT':
					// Undoing a SELECT → set to null
					setSelectedByCategory((prev) => ({
						...prev,
						[last.category]: null,
					}));
					break;
				case 'UNSELECT':
					// Undoing an UNSELECT → restore previous mesh
					if (last.previousState.mesh) {
						setSelectedByCategory((prev) => ({
							...prev,
							[last.category]: {
								id: last.particleId,
								mesh: last.previousState.mesh,
							},
						}));
						if (last.previousState.material) {
							last.previousState.mesh.material = last.previousState.material;
						}
					}
					break;
				case 'SWITCH':
					if (last.previousState.mesh && last.newState?.mesh) {
						// Restore old selected mesh
						setSelectedByCategory((prev) => ({
							...prev,
							[last.category]: {
								id: last.previousState.mesh.name,
								mesh: last.previousState.mesh,
							},
						}));
					}
					break;

				case 'HIDE':
					setHiddenByCategory((prev) => {
						const newSet = new Set(prev[last.category]);
						newSet.delete(last.particleId);
						return { ...prev, [last.category]: newSet };
					});
					break;

				case 'SHOW':
					setHiddenByCategory((prev) => {
						const newSet = new Set(prev[last.category]);
						newSet.add(last.particleId);
						return { ...prev, [last.category]: newSet };
					});
					break;

				case 'SHOW_ALL':
					setHiddenByCategory((prev) => ({
						...prev,
						[last.category]: new Set(last.previousState.hiddenIds),
					}));
					break;

				case 'TOGGLE_MESH_VISIBILITY':
					if (last.category === 0) setShowParticles(last.previousState);
					else if (last.category === 1) setShowPores(last.previousState);
					break;

				case 'TOGGLE_EDGE_PORES':
					setAreEdgePoresHidden(last.previousState);
					break;

				default:
					console.warn('Unknown undo action:', last);
			}

			return prevHistory.slice(0, -1);
		});
	};

	// function restoreMaterial(material: THREE.Material | THREE.Material[] | undefined, prevMaterial: THREE.Material | undefined) {
	// 	if (!material || !prevMaterial) return;

	// 	if (Array.isArray(material)) {
	// 		material.forEach((mat, i) => {
	// 			// Optional: copy full material if stored
	// 			if (Array.isArray(prevMaterial)) {
	// 				mat.copy(prevMaterial[i] as THREE.Material);
	// 			} else {
	// 				mat.copy(prevMaterial);
	// 			}
	// 		});
	// 	} else {
	// 		material.copy(prevMaterial);
	// 	}
	// }

	// function applyMaterial(mesh: THREE.Mesh, material: THREE.Material) {
	// 	if (Array.isArray(mesh.material)) {
	// 		mesh.material.forEach((mat, i) => {
	// 			mat.copy(material); // optional: copy per index
	// 		});
	// 	} else {
	// 		mesh.material.copy(material);
	// 	}
	// }

	return {
		addToHistory,
		undoLastAction,
		clearHistory,
		history,
	};

}