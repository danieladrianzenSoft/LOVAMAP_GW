import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from '../../app/stores/store';
import ScreenshotViewer from "../visualization/screenshot-viewer";
import { ImageCategory, ImageToCreate } from "../../app/models/image";
import { ScaffoldWithMissingThumbnail } from "../../app/models/scaffold";

const AdminBatchThumbnailGenerator: React.FC = () => {
	const { scaffoldGroupStore, userStore } = useStore();
	const [scaffoldQueue, setScaffoldQueue] = useState<ScaffoldWithMissingThumbnail[]>([]);
	const [currentItem, setCurrentItem] = useState<ScaffoldWithMissingThumbnail | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [completed, setCompleted] = useState<number[]>([]);
	const [failed, setFailed] = useState<number[]>([]);

	useEffect(() => {
		const loadQueue = async () => {
			const result = await scaffoldGroupStore.getScaffoldsWithMissingThumbnails();
			setScaffoldQueue(result ?? []);
		};
		loadQueue();
	}, [scaffoldGroupStore]);

	const handleStart = () => {
		if (scaffoldQueue.length > 0) {
			setIsRunning(true);
			setCurrentItem(scaffoldQueue[0]);
		}
	};

	const handleScreenshotReady = async (blob: Blob) => {
		if (!currentItem || !userStore.isLoggedIn) return;

		const { scaffoldId, scaffoldGroupId } = currentItem;

		try {
			const image: ImageToCreate = {
				scaffoldGroupId,
				scaffoldId,
				file: new File([blob], `scaffold-${scaffoldId}.png`, { type: "image/png" }),
				category: ImageCategory.Particles,
			};

			const addedImage = await scaffoldGroupStore.uploadImageForScaffoldGroup(scaffoldGroupId, image);

			if (addedImage) {
				setCompleted((prev) => [...prev, scaffoldId]);
			} else {
				setFailed((prev) => [...prev, scaffoldId]);
			}
		} catch (error) {
			console.error("Upload failed for scaffold", scaffoldId, error);
			setFailed((prev) => [...prev, scaffoldId]);
		}

		// Move to next
		const index = scaffoldQueue.findIndex((item) => item.scaffoldId === scaffoldId);
		const nextItem = scaffoldQueue[index + 1];
		if (nextItem) {
			setCurrentItem(nextItem);
		} else {
			setIsRunning(false);
			setCurrentItem(null);
		}
	};

	const progress = Math.round((completed.length / scaffoldQueue.length) * 100);

	return (
		<div className="border rounded-lg p-6 bg-white shadow flex flex-col justify-between">
			<div>
				<h2 className="text-lg font-semibold mb-4">Batch Thumbnail Generator</h2>
			</div>

			<div>
				<p className="mb-2">Scaffolds queued: {scaffoldQueue.length}</p>
				<p className="mb-2">Completed: {completed.length}</p>
				<p className="mb-4">Failed: {failed.length}</p>

				{completed.length + failed.length === scaffoldQueue.length && scaffoldQueue.length > 0 && (
					<div className="mt-4 text-green-600 font-medium">Batch complete!</div>
				)}
			</div>

			<div>
				<button 
					onClick={handleStart} 
					disabled={isRunning || scaffoldQueue.length === 0}
					className="button-primary">
						Start Batch
				</button>

				{isRunning && (
					<div className="w-full bg-gray-200 rounded-full h-4 mt-4">
						<div
							className="bg-blue-600 h-4 rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				)}

				{isRunning && currentItem && (
					<div style={{ opacity: 0, position: "absolute", width: 512, height: 512, pointerEvents: "none" }}>
						<ScreenshotViewer scaffoldId={currentItem.scaffoldId} onScreenshotReady={handleScreenshotReady} />
					</div>
				)}
			</div>
		</div>
	);
};

export default observer(AdminBatchThumbnailGenerator);