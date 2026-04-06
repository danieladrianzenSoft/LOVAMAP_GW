import React, { useCallback, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ScreenshotViewer from "../visualization/screenshot-viewer";
import { ImageCategory, ImageToCreate } from "../../app/models/image";
import { ScaffoldWithMissingThumbnail } from "../../app/models/scaffold";
import { ThumbnailResetPreview } from "../../app/models/thumbnailResetPreview";

const BATCH_SIZE = 20;
const ALL_CATEGORIES = -1;
const RESETTABLE_CATEGORIES: ImageCategory[] = [
	ImageCategory.Particles,
	ImageCategory.ExteriorPores,
	ImageCategory.InteriorPores,
	ImageCategory.HalfHalf,
	ImageCategory.Other,
];

type RegenItem = ScaffoldWithMissingThumbnail & { category: ImageCategory };

const mergePreviews = (previews: ThumbnailResetPreview[]): ThumbnailResetPreview => ({
	imageIdsToDelete: previews.flatMap((p) => p.imageIdsToDelete),
	scaffoldsWithMeshIds: Array.from(new Set(previews.flatMap((p) => p.scaffoldsWithMeshIds))),
	orphanedScaffoldIds: Array.from(new Set(previews.flatMap((p) => p.orphanedScaffoldIds))),
});

const AdminThumbnailReset: React.FC = () => {
	const { scaffoldGroupStore, userStore } = useStore();

	const [category, setCategory] = useState<number>(ALL_CATEGORIES);
	const [actionMode, setActionMode] = useState<"reset" | "deleteOnly">("reset");

	// Suppress CRA's full-screen error overlay for blob-URL fetch failures.
	// These are harmless: Three.js's GLTF loader throws when a blob URL is
	// revoked while an in-flight fetch is still queued (especially under
	// React StrictMode which double-invokes effects).  The actual screenshot
	// pipeline is unaffected — uploads continue normally.
	useEffect(() => {
		const suppressError = (event: ErrorEvent) => {
			const msg = event.message || event.error?.message || '';
			if (msg.includes('Could not load blob:') || msg.includes('[object Object]')) {
				event.preventDefault();
			}
		};
		const suppressRejection = (event: PromiseRejectionEvent) => {
			const msg = event.reason?.message || String(event.reason);
			if (msg.includes('Could not load blob:') || msg.includes('Failed to fetch')) {
				event.preventDefault();
			}
		};
		window.addEventListener('error', suppressError);
		window.addEventListener('unhandledrejection', suppressRejection);
		return () => {
			window.removeEventListener('error', suppressError);
			window.removeEventListener('unhandledrejection', suppressRejection);
		};
	}, []);
	const [preview, setPreview] = useState<ThumbnailResetPreview | null>(null);
	const [loadingPreview, setLoadingPreview] = useState(false);
	const [showOrphans, setShowOrphans] = useState(false);

	// Delete phase
	const [deletionQueue, setDeletionQueue] = useState<number[][]>([]);
	const [completedDeleteBatches, setCompletedDeleteBatches] = useState(0);
	const [deleteSucceededCount, setDeleteSucceededCount] = useState<number | null>(null);
	const [deleteFailedCount, setDeleteFailedCount] = useState<number | null>(null);

	// Regen phase
	const [regenQueue, setRegenQueue] = useState<RegenItem[]>([]);
	const [currentRegenItem, setCurrentRegenItem] = useState<RegenItem | null>(null);
	const [regenCompleted, setRegenCompleted] = useState<number[]>([]);
	const [regenFailed, setRegenFailed] = useState<number[]>([]);

	const [isRunning, setIsRunning] = useState(false);
	const [phase, setPhase] = useState<"idle" | "deleting" | "regenerating" | "done">("idle");

	const categoriesForSelection = (): ImageCategory[] =>
		category === ALL_CATEGORIES ? RESETTABLE_CATEGORIES : [category as ImageCategory];

	const loadPreview = useCallback(async () => {
		setLoadingPreview(true);
		setPreview(null);
		setShowOrphans(false);
		setDeleteSucceededCount(null);
		setDeleteFailedCount(null);
		setRegenCompleted([]);
		setRegenFailed([]);
		setCompletedDeleteBatches(0);
		setPhase("idle");

		const cats = category === ALL_CATEGORIES ? RESETTABLE_CATEGORIES : [category as ImageCategory];
		const results = await Promise.all(cats.map((c) => scaffoldGroupStore.getThumbnailResetPreview(c)));
		const valid = results.filter((r): r is ThumbnailResetPreview => r != null);
		setPreview(mergePreviews(valid));
		setLoadingPreview(false);
	}, [category, scaffoldGroupStore]);

	useEffect(() => {
		loadPreview();
	}, [loadPreview]);

	const handleReset = async () => {
		if (!preview || !userStore.isLoggedIn) return;

		if (actionMode === "deleteOnly") {
			const confirmed = window.confirm(
				`This will delete ${preview.imageIdsToDelete.length} thumbnail(s) without regenerating any. Continue?`
			);
			if (!confirmed) return;
		} else if (preview.orphanedScaffoldIds.length > 0) {
			const confirmed = window.confirm(
				`${preview.orphanedScaffoldIds.length} scaffold(s) will be left without a thumbnail (no mesh to regenerate from). Continue?`
			);
			if (!confirmed) return;
		}

		setIsRunning(true);
		setPhase("deleting");

		// Phase 1: delete in batches of 20
		const batches: number[][] = [];
		for (let i = 0; i < preview.imageIdsToDelete.length; i += BATCH_SIZE) {
			batches.push(preview.imageIdsToDelete.slice(i, i + BATCH_SIZE));
		}
		setDeletionQueue(batches);
		setCompletedDeleteBatches(0);

		const succeeded: number[] = [];
		const failed: number[] = [];

		for (let i = 0; i < batches.length; i++) {
			const result = await scaffoldGroupStore.deleteImages(batches[i]);
			if (result) {
				succeeded.push(...(result.succeededIds ?? []));
				failed.push(...(result.failedIds ?? []));
			} else {
				failed.push(...batches[i]);
			}
			setCompletedDeleteBatches(i + 1);
		}

		setDeleteSucceededCount(succeeded.length);
		setDeleteFailedCount(failed.length);

		// Delete-only mode: skip regeneration
		if (actionMode === "deleteOnly") {
			setPhase("done");
			setIsRunning(false);
			return;
		}

		// Phase 2: fetch fresh queue per category and regenerate
		setPhase("regenerating");
		const cats = categoriesForSelection();
		const perCategoryQueues = await Promise.all(
			cats.map(async (c) => {
				const items = await scaffoldGroupStore.getScaffoldsWithMissingThumbnails(c);
				return items.map<RegenItem>((item) => ({ ...item, category: c }));
			})
		);
		// Thumbnails are per scaffold-group, so we only need one screenshot
		// per group per category.  Pick the first scaffold from each group.
		const seen = new Set<string>();
		const queue = perCategoryQueues.flat().filter((item) => {
			const key = `${item.scaffoldGroupId}-${item.category}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
		setRegenQueue(queue);

		if (queue.length > 0) {
			setCurrentRegenItem(queue[0]);
		} else {
			setPhase("done");
			setIsRunning(false);
		}
	};

	const advanceRegen = (currentScaffoldId: number, currentCategory: ImageCategory) => {
		const index = regenQueue.findIndex(
			(item) => item.scaffoldId === currentScaffoldId && item.category === currentCategory
		);
		const nextItem = regenQueue[index + 1];
		// Clear current item first so the old ScreenshotViewer unmounts and
		// its Canvas/GLTF resources release before the next one starts.
		setCurrentRegenItem(null);
		if (nextItem) {
			setTimeout(() => setCurrentRegenItem(nextItem), 150);
		} else {
			setPhase("done");
			setIsRunning(false);
		}
	};

	const handleScreenshotReady = async (blob: Blob) => {
		if (!currentRegenItem || !userStore.isLoggedIn) return;

		const { scaffoldId, scaffoldGroupId, category: itemCategory } = currentRegenItem;

		try {
			const image: ImageToCreate = {
				scaffoldGroupId,
				scaffoldId,
				file: new File([blob], `scaffold-${scaffoldId}.png`, { type: "image/png" }),
				category: itemCategory,
			};

			const addedImage = await scaffoldGroupStore.uploadImageForScaffoldGroup(scaffoldGroupId, image);

			if (addedImage) {
				setRegenCompleted((prev) => [...prev, scaffoldId]);
			} else {
				setRegenFailed((prev) => [...prev, scaffoldId]);
			}
		} catch (error) {
			console.error("Upload failed for scaffold", scaffoldId, error);
			setRegenFailed((prev) => [...prev, scaffoldId]);
		}

		advanceRegen(scaffoldId, itemCategory);
	};

	const handleScreenshotError = (error: unknown) => {
		if (!currentRegenItem) return;
		const { scaffoldId, category: itemCategory } = currentRegenItem;
		console.warn(`Skipping scaffold ${scaffoldId} (category ${itemCategory}): mesh unavailable`, error);
		setRegenFailed((prev) => [...prev, scaffoldId]);
		advanceRegen(scaffoldId, itemCategory);
	};

	const deleteProgress = deletionQueue.length
		? Math.round((completedDeleteBatches / deletionQueue.length) * 100)
		: 0;

	const regenProgress = regenQueue.length
		? Math.round(((regenCompleted.length + regenFailed.length) / regenQueue.length) * 100)
		: 0;

	const disableButton =
		isRunning ||
		loadingPreview ||
		!preview ||
		(actionMode === "deleteOnly"
			? preview.imageIdsToDelete.length === 0
			: preview.imageIdsToDelete.length === 0 && preview.scaffoldsWithMeshIds.length === 0);

	return (
		<div className="border rounded-lg p-6 bg-white shadow flex flex-col justify-between">
			<div>
				<h2 className="text-lg font-semibold mb-4">Reset Thumbnails</h2>
			</div>

			<div>
				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700">Category</label>
					<select
						className="mt-1 block w-full p-2 border rounded-md"
						value={category}
						onChange={(e) => setCategory(parseInt(e.target.value, 10))}
						disabled={isRunning}
					>
						<option value={ALL_CATEGORIES}>All</option>
						<option value={ImageCategory.Particles}>Particles</option>
						<option value={ImageCategory.ExteriorPores}>ExteriorPores</option>
						<option value={ImageCategory.InteriorPores}>InteriorPores</option>
						<option value={ImageCategory.HalfHalf}>HalfHalf</option>
						<option value={ImageCategory.Other}>Other</option>
					</select>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700">Action</label>
					<select
						className="mt-1 block w-full p-2 border rounded-md"
						value={actionMode}
						onChange={(e) => setActionMode(e.target.value as "reset" | "deleteOnly")}
						disabled={isRunning}
					>
						<option value="reset">Reset (Delete + Regenerate)</option>
						<option value="deleteOnly">Delete Only</option>
					</select>
				</div>

				{loadingPreview && (
					<p className="mb-4 text-sm text-gray-500">Loading preview…</p>
				)}

				{!loadingPreview && preview && (
					<div className="mb-4 text-sm text-gray-700 space-y-1">
						<p>{preview.imageIdsToDelete.length} thumbnails will be deleted</p>
						{actionMode !== "deleteOnly" && (
							<>
								<p>{preview.scaffoldsWithMeshIds.length} scaffolds will be re-screenshotted (mesh available)</p>
								<p>
									{preview.orphanedScaffoldIds.length} scaffolds will be left without a thumbnail (no mesh yet)
									{preview.orphanedScaffoldIds.length > 0 && (
										<button
											type="button"
											onClick={() => setShowOrphans((v) => !v)}
											className="ml-2 text-blue-600 hover:underline text-xs"
										>
											{showOrphans ? "hide" : "show"}
										</button>
									)}
								</p>
								{showOrphans && preview.orphanedScaffoldIds.length > 0 && (
									<div className="mt-2 p-2 border rounded bg-gray-50 max-h-32 overflow-y-auto text-xs text-gray-600 font-mono leading-relaxed">
										{preview.orphanedScaffoldIds.join(", ")}
									</div>
								)}
							</>
						)}
						{/* {actionMode !== "deleteOnly" &&
							(category === ImageCategory.InteriorPores ||
							 category === ImageCategory.HalfHalf ||
							 category === ALL_CATEGORIES) && (
							<p className="text-xs text-amber-600 mt-1">
								InteriorPores and HalfHalf require pore metadata (edge info). Scaffolds without metadata will be skipped during regeneration.
							</p>
						)} */}
					</div>
				)}

				{phase === "deleting" && (
					<div className="mt-2">
						<p className="text-xs text-gray-600 mb-1">
							Deleting images… ({completedDeleteBatches}/{deletionQueue.length} batches)
						</p>
						<div className="w-full bg-gray-200 rounded-full h-4">
							<div
								className="bg-red-500 h-4 rounded-full transition-all duration-300"
								style={{ width: `${deleteProgress}%` }}
							></div>
						</div>
					</div>
				)}

				{(phase === "regenerating" || phase === "done") && deleteSucceededCount !== null && (
					<p className="mt-3 text-green-600 text-sm">Deleted {deleteSucceededCount} images.</p>
				)}
				{(phase === "regenerating" || phase === "done") && deleteFailedCount !== null && deleteFailedCount > 0 && (
					<p className="text-red-600 text-sm">Failed to delete {deleteFailedCount} images.</p>
				)}

				{phase === "regenerating" && (
					<div className="mt-3">
						<p className="text-xs text-gray-600 mb-1">
							Regenerating thumbnails… ({regenCompleted.length + regenFailed.length}/{regenQueue.length})
						</p>
						<div className="w-full bg-gray-200 rounded-full h-4">
							<div
								className="bg-blue-600 h-4 rounded-full transition-all duration-300"
								style={{ width: `${regenProgress}%` }}
							></div>
						</div>
					</div>
				)}

				{phase === "done" && actionMode !== "deleteOnly" && (
					<>
						<p className="mt-3 text-green-600 text-sm">Regenerated {regenCompleted.length} thumbnails.</p>
						{regenFailed.length > 0 && (
							<p className="text-red-600 text-sm">Failed to regenerate {regenFailed.length} thumbnails.</p>
						)}
					</>
				)}
				{phase === "done" && actionMode === "deleteOnly" && (
					<p className="mt-3 text-green-600 text-sm">Deletion complete.</p>
				)}
			</div>

			<div className="mt-4">
				<button
					type="button"
					onClick={handleReset}
					className="button-primary w-full"
					disabled={disableButton}
				>
					{isRunning ? "Running…" : actionMode === "deleteOnly" ? "Delete Images" : "Reset Thumbnails"}
				</button>

				{phase === "regenerating" && currentRegenItem && (
					<div style={{ opacity: 0, position: "absolute", width: 512, height: 512, pointerEvents: "none" }}>
						<ScreenshotViewer
							scaffoldId={currentRegenItem.scaffoldId}
							category={currentRegenItem.category}
							onScreenshotReady={handleScreenshotReady}
							onError={handleScreenshotError}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default observer(AdminThumbnailReset);
