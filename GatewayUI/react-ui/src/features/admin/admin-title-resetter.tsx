import { useCallback, useEffect, useState } from "react";
import { useStore } from '../../app/stores/store';
import { observer } from "mobx-react-lite";
import { BatchOperationResult } from "../../app/models/batchOperationResult";

const AdminTitleResetter: React.FC = () => {
	const { scaffoldGroupStore } = useStore();
	const [operationResult, setOperationResult] = useState<BatchOperationResult | null>(null);
	const [scaffoldGroupsCount, setscaffoldGroupsCount] = useState<number | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [queue, setQueue] = useState<number[][]>([]);
	const [completedBatches, setCompletedBatches] = useState<number>(0);
	const BATCH_SIZE = 50; // You can adjust this

	const getIds = useCallback(async () => {
		const loadIds = async () => {
			const ids = await scaffoldGroupStore.getIds();
			setscaffoldGroupsCount(ids?.length ?? 0);

			const batches: number[][] = [];
			for (let i = 0; i < ids.length; i += BATCH_SIZE) {
				batches.push(ids.slice(i, i + BATCH_SIZE));
			}
			setQueue(batches);
			setCompletedBatches(0);
		}
		loadIds();
	}, [scaffoldGroupStore]);

	useEffect(() => {
		getIds();
	}, [getIds, scaffoldGroupStore]);

	const handleReset = async () => {
		if (!queue.length) return;
		setIsRunning(true);

		setIsRunning(true);
		const allSucceeded: number[] = [];
		const allFailed: number[] = [];

		for (let i = 0; i < queue.length; i++) {
			const batch = queue[i];
			const result = await scaffoldGroupStore.resetNamesAndComments(batch);

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

		setOperationResult(finalResult);
		setIsRunning(false);
	};

	const progress = queue.length
		? Math.round((completedBatches / queue.length) * 100)
		: 0;

	return (
		<div className="border rounded-lg p-6 bg-white shadow flex flex-col justify-between">
			<div>
				<h2 className="text-lg font-semibold mb-4">Title Reset Tool</h2>
			</div>

			<div>
				<div className="mb-4">
					
				</div>

				<div className="mb-4">
					
				</div>

				{scaffoldGroupsCount !== null && (
					<p className="mb-4 text-sm text-gray-700">{scaffoldGroupsCount} scaffold groups eligible for title reset</p>
				)}
				{operationResult !== null && (
					<>
						<p className="mt-4 text-green-600 text-sm">Reset {operationResult.succeededIds?.length} titles.</p>
						<p className="mb-2 text-red-600 text-sm">Failed to reset {operationResult.failedIds?.length} titles.</p>
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
					onClick={handleReset}
					className="button-primary w-full"
					disabled={isRunning || scaffoldGroupsCount === 0}
				>
					{isRunning ? "Resetting..." : "Reset Titles"}
				</button>
			</div>
		</div>
	);
};

export default observer(AdminTitleResetter);
