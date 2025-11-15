// MatchPicker.tsx
import React, { useState } from "react";
import { ScaffoldGroupMatch } from "../../app/models/scaffoldGroup";

type Props = {
  matches: ScaffoldGroupMatch[];
  onNext: (scaffoldGroupId: number) => void; // null means create-new
  onBack: () => void;
};

export const MatchPicker: React.FC<Props> = ({ matches = [], onNext, onBack }) => {
	const [selectedScaffoldGroupId, setSelectedScaffoldGroupId] = useState<number | null>(null);

	const handleNext = () => {
		if (selectedScaffoldGroupId !== null) {
		onNext(selectedScaffoldGroupId);
		}
	};

	const isNextDisabled = selectedScaffoldGroupId === null;
		
	return (
		<div className="p-4 bg-white rounded">
			{/* <h4 className="text-lg font-semibold mb-3">2. Select a matching scaffold group, or create a new one</h4> */}
			<div className="flex flex-col md:flex-row md:justify-between md:items-center">
				{/* <p className="text-xl mb-2 md:mb-4 w-full">1. Select your scaffold's properties</p> */}
				<h3 className="text-lg mb-2 md:mb-4 w-full font-semibold">2. Select a matching scaffold group, or create a new one</h3>
				<div className="flex justify-end space-x-1 w-full md:w-auto">
					<button type="submit" className="button-outline" onClick={onBack}>Back</button>
					<button
						type="button"
						className="button-outline disabled:opacity-60 disabled:cursor-not-allowed"
						disabled={isNextDisabled}
						onClick={handleNext}
						aria-disabled={isNextDisabled}
					>
						Next
					</button>
				</div>
			</div>

			{matches.length === 0 ? (
				<div className="text-sm text-gray-600">No matches found.</div>
			) : (
				<div className="space-y-2 mb-4">
					{matches.map((m) => {
						const isActive = selectedScaffoldGroupId === m.scaffoldGroupId;
						return (
						<button
							key={m.scaffoldGroupId}
							type="button"
							onClick={() => setSelectedScaffoldGroupId(m.scaffoldGroupId)}
							className={`w-full text-left p-3 border rounded flex justify-between items-center transition
										${isActive ? "ring-2 ring-blue-400 border-blue-300" : "hover:bg-gray-50"}`}
						>
							<div>
								<div className="font-medium">{m.name}</div>
								<div className="text-xs text-gray-500">Match Score: {Number(m.matchScore).toFixed(1)}</div>
								<div className="text-xs text-gray-600 mt-1">
									{Object.keys(m.differences ?? {}).slice(0, 3).join(", ")}
								</div>
							</div>
							{/* <div className="shrink-0">
							<span className={`px-2 py-1 rounded text-xs ${isActive ? "bg-blue-100" : "bg-gray-100"}`}>
								{isActive ? "Selected" : "Select"}
							</span>
							</div> */}
						</button>
						);
					})}
				</div>
			)}
			{/* Create-new tile */}
			<button
				type="button"
				onClick={() => setSelectedScaffoldGroupId(0)}
				className={`w-full p-3 border rounded flex items-center justify-between transition
							${selectedScaffoldGroupId === 0 ? "ring-2 ring-blue-400 border-blue-300" : "hover:bg-gray-50"}`}
			>
				<span className="font-medium">Create new scaffold group</span>
				{/* <span className={`px-2 py-1 rounded text-xs ${selectedScaffoldGroupId === 0 ? "bg-blue-100" : "bg-gray-100"}`}>
				{selectedScaffoldGroupId === 0 ? "Selected" : "Select"}
				</span> */}
			</button>
		</div>
	);
};

export default MatchPicker;