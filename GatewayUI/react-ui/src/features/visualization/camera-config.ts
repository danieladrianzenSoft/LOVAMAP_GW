import * as THREE from "three";

// Shared camera configuration so canvas-viewer, screenshot-viewer, and
// model.tsx all frame meshes identically. Keeping these values in one
// place ensures the screenshots match what the user sees in the viewer.

// Props passed to the <Canvas camera={...}> prop.
export const CANVAS_CAMERA_PROPS = {
	fov: 20,
	near: 0.1,
	far: 10000,
} as const;

// Direction the camera looks from, relative to the mesh center.
export const CAMERA_DIRECTION = new THREE.Vector3(0.9, 0.5, 0.8).normalize();

// Distance = size * this factor. Tuned for the 20° FOV above; narrower FOV
// requires a larger multiplier to keep the scene at roughly the same
// apparent size (going 75° → 20° scales distance by ~4.35, so 0.8 → ~3.5).
export const CAMERA_DISTANCE_FACTOR = 3.5;

// Applies our standard framing to a camera given a mesh's bounding size
// and center. Also sets near/far planes and updates the projection matrix.
export function applyCameraFraming(
	camera: THREE.Camera,
	center: THREE.Vector3,
	size: number,
): THREE.Vector3 {
	const position = CAMERA_DIRECTION.clone().multiplyScalar(size * CAMERA_DISTANCE_FACTOR).add(center);
	camera.position.copy(position);
	camera.lookAt(center);
	(camera as THREE.PerspectiveCamera).near = size / 10;
	(camera as THREE.PerspectiveCamera).far = size * 10;
	(camera as THREE.PerspectiveCamera).updateProjectionMatrix();
	return position;
}
