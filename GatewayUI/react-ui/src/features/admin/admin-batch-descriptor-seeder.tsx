import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from '../../app/stores/store';
import { DescriptorSeedResult } from "../../app/models/descriptor";

const descriptorOptions = [
	"ParticleAspectRatio",
	// Add more descriptor names here as needed
];

const BATCH_SIZE = 50;

const AdminBatchDescriptorSeeder: React.FC = () => {
	const { seedStore } = useStore();
	const [selectedDescriptor, setSelectedDescriptor] = useState<string | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [resultMessage, setResultMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<DescriptorSeedResult | null>(null);
	const [eligibleScaffoldIds, setEligibleScaffoldIds] = useState<number[]>([]);
	const [batches, setBatches] = useState<number[][]>([]);
	const [completedBatches, setCompletedBatches] = useState(0);

	// Fetch eligible IDs and split into batches
	useEffect(() => {
		const loadEligibleIds = async () => {
			if (!selectedDescriptor) return;
			setIsRunning(true);
			setResult(null);
			setResultMessage(null);
			setError(null);
			setCompletedBatches(0);

			try {
				const ids = await seedStore.getEligibleScaffoldIdsForDescriptorSeeding(selectedDescriptor);
				if (!ids) throw new Error("No eligible scaffold IDs found.");
				setEligibleScaffoldIds(ids);

				const split: number[][] = [];
				for (let i = 0; i < ids.length; i += BATCH_SIZE) {
					split.push(ids.slice(i, i + BATCH_SIZE));
				}
				setBatches(split);
			} catch (e: any) {
				setError(`Failed to load eligible scaffolds: ${e.message}`);
			} finally {
				setIsRunning(false);
			}
		};

		loadEligibleIds();
	}, [selectedDescriptor, seedStore]);

	// Handler to run batches
	const handleSeed = async () => {
		if (!selectedDescriptor || batches.length === 0) return;

		setIsRunning(true);
		setResultMessage(null);
		setError(null);
		setResult(null);
		setCompletedBatches(0);

		let totalAttempted = 0;
		let totalSucceeded = 0;
		let failedScaffoldIds: number[] = [];

		for (let i = 0; i < batches.length; i++) {
			try {
				const res = await seedStore.seedDescriptor(selectedDescriptor, batches[i]);
				if (res) {
					totalAttempted += res.attempted;
					totalSucceeded += res.succeeded;
					failedScaffoldIds.push(...res.failedScaffoldIds);
				}
			} catch (e: any) {
				console.error("Batch failed", e);
				failedScaffoldIds.push(...batches[i]);
			}
			setCompletedBatches(i + 1);
		}

		setResult({
			attempted: totalAttempted,
			succeeded: totalSucceeded,
			failedScaffoldIds,
		});

		setResultMessage(`Seeded ${totalSucceeded} scaffolds. Skipped ${totalAttempted - totalSucceeded}.`);
		setIsRunning(false);
	};

	const progress = batches.length
		? Math.round((completedBatches / batches.length) * 100)
		: 0;

	return (
		<div className="border rounded-lg p-6 bg-white shadow flex flex-col justify-between">
			<div>
				<h2 className="text-lg font-semibold mb-4">Descriptor Seeding Tool</h2>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700">
						Select Descriptor to Seed
					</label>
					<select
						className="mt-1 block w-full p-2 border rounded-md"
						value={selectedDescriptor ?? ""}
						onChange={(e) => {
							const value = e.target.value || null;
							setSelectedDescriptor(value);
							setEligibleScaffoldIds([]);
							setBatches([]);
							setCompletedBatches(0);
							setResult(null);
							setResultMessage(null);
							setError(null);
						}}
					>
						<option value="">-- Choose a descriptor --</option>
						{descriptorOptions.map((name) => (
							<option key={name} value={name}>
								{name}
							</option>
						))}
					</select>
				</div>

				{eligibleScaffoldIds.length > 0 && (
					<p className="text-sm text-gray-700 mb-4">
						{eligibleScaffoldIds.length} scaffolds eligible for seeding
					</p>
				)}

				{isRunning && (
					<div className="w-full bg-gray-200 rounded-full h-4 mt-4 mb-2">
						<div
							className="bg-blue-600 h-4 rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				)}

				{result && (
					<div className="mt-4">
						<p className="text-sm text-gray-800">Total attempted: {result.attempted}</p>
						<p className="text-sm text-green-600">Successfully seeded: {result.succeeded}</p>
						{result.failedScaffoldIds.length > 0 && (
							<div className="mt-2 text-red-600 text-sm">
								<p>Failed for {result.failedScaffoldIds.length} scaffolds:</p>
								<ul className="ml-4 list-disc">
									{result.failedScaffoldIds.map(id => (
										<li key={id}>Scaffold ID: {id}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}

				{resultMessage && (
					<p className="mt-2 text-green-600 text-sm">{resultMessage}</p>
				)}
				{error && (
					<p className="mt-2 text-red-600 text-sm">{error}</p>
				)}
			</div>

			<div>
				<button
					type="button"
					onClick={handleSeed}
					className="button-primary w-full"
					disabled={isRunning || !selectedDescriptor || batches.length === 0}
				>
					{isRunning ? "Seeding..." : "Seed Descriptor"}
				</button>
			</div>
		</div>
	);
};

export default observer(AdminBatchDescriptorSeeder);