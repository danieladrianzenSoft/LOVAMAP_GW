import React, { useState } from 'react';
import * as THREE from 'three';
import CanvasViewer from '../visualization/canvas-viewer';

interface JobMeshViewerProps {
	blobUrl: string;
}

const JobMeshViewer: React.FC<JobMeshViewerProps> = ({ blobUrl }) => {
	const [hiddenIds] = useState<Set<string>>(() => new Set());

	const meshes = [
		{
			url: blobUrl,
			category: 0,
			visible: true,
			hiddenIds,
			selectedEntity: null,
			onEntityClick: () => {},
			onEntityRightClick: () => {},
		},
	];

	return (
		<div className="h-80 border rounded-lg bg-gray-50 overflow-hidden relative">
			<CanvasViewer meshes={meshes} />
		</div>
	);
};

export default JobMeshViewer;
