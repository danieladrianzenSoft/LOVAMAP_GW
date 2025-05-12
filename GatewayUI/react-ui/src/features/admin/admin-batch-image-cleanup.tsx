import { useCallback, useEffect, useState } from "react";
import { useStore } from '../../app/stores/store';
import { observer } from "mobx-react-lite";
import { BatchOperationResult } from "../../app/models/batchOperationResult";

const AdminBatchImageCleanup: React.FC = () => {
	const { scaffoldGroupStore } = useStore();
	const [category, setCategory] = useState<number | null>(null);
	const [includeThumbnails, setIncludeThumbnails] = useState(false);
	const [imageCount, setImageCount] = useState<number | null>(null);
	const [imagesToDelete, setImagesToDelete] = useState<number[] | null>(null);
	const [deleteOperationResult, setDeleteOperationResult] = useState<BatchOperationResult | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	

	const previewDeletableImages = useCallback(async () => {
		const loadIds = async () => {
			const ids = await scaffoldGroupStore.getImageIdsForDeletion(category, includeThumbnails);
			setImagesToDelete(ids ?? []);
			setImageCount(ids?.length ?? 0);
		}
		loadIds();
	}, [category, includeThumbnails, scaffoldGroupStore]);

	useEffect(() => {
		previewDeletableImages();
	}, [category, includeThumbnails, previewDeletableImages]);

	const handleDelete = async () => {
		if (!imagesToDelete || imagesToDelete.length === 0) {
			setIsDeleting(false);
			return;
		}
		setIsDeleting(true);
		const result = await scaffoldGroupStore.deleteImages(imagesToDelete);
		setDeleteOperationResult(result);
		setIsDeleting(false);
	};

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
			</div>

			<div>
				<button
					type="button"
					onClick={handleDelete}
					className="button-primary w-full"
					disabled={isDeleting || imageCount === 0}
				>
					{isDeleting ? "Deleting..." : "Delete Images"}
				</button>
			</div>
		</div>
	);
};

export default observer(AdminBatchImageCleanup);
