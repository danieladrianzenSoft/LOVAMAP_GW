import { useCallback, useEffect, useState } from "react";
import { useStore } from '../../app/stores/store';
import { observer } from "mobx-react-lite";
import { BatchOperationResult } from "../../app/models/batchOperationResult";

const AdminBatchImageCleanup: React.FC = () => {
	const { scaffoldGroupStore } = useStore();
	const [category, setCategory] = useState<number | null>(null);
	const [includeThumbnails, setIncludeThumbnails] = useState(false);
	const [imageCount, setImageCount] = useState<number | null>(null);
	const [deleteOperationResult, setDeleteOperationResult] = useState<BatchOperationResult | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [deletionQueue, setDeletionQueue] = useState<number[][]>([]);
	const [completedBatches, setCompletedBatches] = useState<number>(0);
	const BATCH_SIZE = 20;

	const previewDeletableImages = useCallback(async () => {
		const loadIds = async () => {
			const ids = await scaffoldGroupStore.getImageIdsForDeletion(category, includeThumbnails);
			setImageCount(ids?.length ?? 0);

			const batches: number[][] = [];
			for (let i = 0; i < ids.length; i += BATCH_SIZE) {
				batches.push(ids.slice(i, i + BATCH_SIZE));
			}
			setDeletionQueue(batches);
			setCompletedBatches(0);
		}
		loadIds();
	}, [category, includeThumbnails, scaffoldGroupStore]);

	useEffect(() => {
		previewDeletableImages();
	}, [category, includeThumbnails, previewDeletableImages]);

	const handleDelete = async () => {
		if (!deletionQueue.length) return;
		setIsRunning(true);

		setIsRunning(true);
		const allSucceeded: number[] = [];
		const allFailed: number[] = [];

		for (let i = 0; i < deletionQueue.length; i++) {
			const batch = deletionQueue[i];
			const result = await scaffoldGroupStore.deleteImages(batch);

			if (result) {
				allSucceeded.push(...(result.succeededIds ?? []));
				allFailed.push(...(result.failedIds ?? []));
			}

			setCompletedBatches(i + 1);
		}

		const finalResult: BatchOperationResult = {
			allSucceeded: allFailed.length === 0,
			succeededIds: allSucceeded,
			failedIds: allFailed,
		};

		setDeleteOperationResult(finalResult);
		setIsRunning(false);
	};

	const progress = deletionQueue.length
		? Math.round((completedBatches / deletionQueue.length) * 100)
		: 0;

	return (
		<div className="border rounded-lg p-6 bg-white shadow flex flex-col justify-between">
			<div>
				<h2 className="text-lg font-semibold mb-4">Image Cleanup Tool</h2>
			</div>

			<div>
				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700">Filter by Category (optional)</label>
					<select
						className="mt-1 block w-full p-2 border rounded-md"
						value={category ?? ""}
						onChange={(e) => {
							const value = e.target.value;
							setCategory(value === "" ? null : parseInt(value, 10));
						}}
					>
						<option value="">All</option>
						<option value="0">Particles</option>
						<option value="1">ExteriorPores</option>
						<option value="2">InteriorPores</option>
						<option value="3">ParticleSizeDistribution</option>
						<option value="4">Other</option>
					</select>
				</div>

				<div className="mb-4">
					<label className="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={includeThumbnails}
							onChange={(e) => setIncludeThumbnails(e.target.checked)}
						/>
						<span>Include Thumbnails</span>
					</label>
				</div>

				{imageCount !== null && (
					<p className="mb-4 text-sm text-gray-700">{imageCount} images eligible for deletion</p>
				)}
				{deleteOperationResult !== null && (
					<>
						<p className="mt-4 text-green-600 text-sm">Deleted {deleteOperationResult.succeededIds?.length} images.</p>
						<p className="mb-2 text-red-600 text-sm">Failed to delete {deleteOperationResult.failedIds?.length} images.</p>
					</>
				)}

				{isRunning && (
					<div className="w-full bg-gray-200 rounded-full h-4 mt-4 mb-2">
						<div
							className="bg-blue-600 h-4 rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				)}

			</div>

			<div>
				<button
					type="button"
					onClick={handleDelete}
					className="button-primary w-full"
					disabled={isRunning || imageCount === 0}
				>
					{isRunning ? "Deleting..." : "Delete Images"}
				</button>
			</div>
		</div>
	);
};

export default observer(AdminBatchImageCleanup);
