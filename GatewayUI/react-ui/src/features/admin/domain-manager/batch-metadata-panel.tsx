import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import agent from "../../../app/api/agent";
import { DomainLookupItem, BatchMetadataUpdateResult } from "../../../app/models/domainManager";

interface FileMatch {
	file: File;
	domainId: number;
	scaffoldId: number;
	category: string;
	originalFileName: string;
	hasExistingMetadata: boolean;
	companionMesh: File | null;
}

interface UnmatchedFile {
	file: File;
	normalizedStem: string;
}

type Phase = "idle" | "matching" | "matched" | "uploading" | "done";

function normalizeFileName(fileName: string): string {
	const lastDot = fileName.lastIndexOf(".");
	const ext = lastDot >= 0 ? fileName.substring(lastDot) : "";
	let stem = lastDot >= 0 ? fileName.substring(0, lastDot) : fileName;
	const atIndex = stem.lastIndexOf("@");
	if (atIndex > 0) {
		stem = stem.substring(0, atIndex);
	}
	return stem + ext;
}

interface BatchMetadataPanelProps {
	onBatchComplete?: () => void;
}

const BatchMetadataPanel: React.FC<BatchMetadataPanelProps> = ({ onBatchComplete }) => {
	const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
	const [includeMeshes, setIncludeMeshes] = useState(false);
	const [categoryFilter, setCategoryFilter] = useState<"Particles" | "Pores">("Particles");
	const [batchSize, setBatchSize] = useState(50);
	const [phase, setPhase] = useState<Phase>("idle");
	const [matches, setMatches] = useState<FileMatch[]>([]);
	const [unmatched, setUnmatched] = useState<UnmatchedFile[]>([]);
	const [result, setResult] = useState<BatchMetadataUpdateResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
	const [invalidDomainIds, setInvalidDomainIds] = useState<Set<number> | null>(null);
	const [repairMode, setRepairMode] = useState(false);
	const [checkingInvalid, setCheckingInvalid] = useState(false);
	const [infoMessage, setInfoMessage] = useState<string | null>(null);

	const handleCheckInvalid = async () => {
		setCheckingInvalid(true);
		setError(null);
		setInfoMessage(null);
		try {
			const res = await agent.Admin.getInvalidMeshDomainIds();
			const ids = new Set(res.data ?? []);
			setInvalidDomainIds(ids);
			if (ids.size === 0) {
				setRepairMode(false);
				setInfoMessage("All meshes are valid — no repairs needed.");
			} else {
				setRepairMode(true);
				setIncludeMeshes(true);
			}
		} catch (err: any) {
			setError(err?.message || "Failed to check for invalid meshes");
		} finally {
			setCheckingInvalid(false);
		}
	};

	const exitRepairMode = () => {
		setRepairMode(false);
		setInvalidDomainIds(null);
	};

	const onDrop = useCallback((acceptedFiles: File[]) => {
		setDroppedFiles((prev) => {
			const existingNames = new Set(prev.map((f) => f.name));
			const newFiles = acceptedFiles.filter((f) => !existingNames.has(f.name));
			return [...prev, ...newFiles];
		});
		// Reset to idle if we were in matched/done state
		setPhase("idle");
		setMatches([]);
		setUnmatched([]);
		setResult(null);
		setError(null);
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/json": [".json"],
			"model/gltf-binary": [".glb"],
		},
		noClick: droppedFiles.length > 0,
	});

	const removeFile = (name: string) => {
		setDroppedFiles((prev) => prev.filter((f) => f.name !== name));
	};

	const handleMatch = async () => {
		setPhase("matching");
		setError(null);
		setInfoMessage(null);

		try {
			const res = await agent.Admin.getDomainLookup();
			const allItems: DomainLookupItem[] = res.data ?? [];

			// Filter by selected category so Particles don't match Pore domains (and vice versa)
			const lookupItems = allItems.filter((item) => item.category === categoryFilter);

			// Build lookup: normalized .glb name → domain
			const lookup = new Map<string, DomainLookupItem>();
			for (const item of lookupItems) {
				const normalized = normalizeFileName(item.originalFileName).toLowerCase();
				lookup.set(normalized, item);
			}

			// Separate metadata JSONs and GLBs
			const metadataFiles = droppedFiles.filter((f) => f.name.endsWith("_metadata.json"));
			const glbFiles = droppedFiles.filter((f) => f.name.toLowerCase().endsWith(".glb"));
			const glbByNormalizedStem = new Map<string, File>();
			for (const g of glbFiles) {
				const stem = g.name.substring(0, g.name.length - 4); // strip .glb
				glbByNormalizedStem.set(stem.toLowerCase(), g);
			}

			const newMatches: FileMatch[] = [];
			const newUnmatched: UnmatchedFile[] = [];

			for (const f of metadataFiles) {
				// e.g. "foo_metadata.json" → baseStem "foo" → look up "foo.glb"
				const baseStem = f.name.replace("_metadata.json", "");
				const glbName = baseStem + ".glb";
				const normalizedGlb = normalizeFileName(glbName).toLowerCase();

				const domain = lookup.get(normalizedGlb);
				if (domain) {
					// Find companion .glb from dropped files
					const companionMesh = glbByNormalizedStem.get(baseStem.toLowerCase()) ?? null;
					newMatches.push({
						file: f,
						domainId: domain.id,
						scaffoldId: domain.scaffoldId,
						category: domain.category,
						originalFileName: domain.originalFileName,
						hasExistingMetadata: domain.hasMetadata,
						companionMesh,
					});
				} else {
					newUnmatched.push({ file: f, normalizedStem: normalizedGlb });
				}
			}

			// In repair mode, keep only matches whose domain has an invalid mesh
			const finalMatches = repairMode && invalidDomainIds
				? newMatches.filter((m) => invalidDomainIds.has(m.domainId))
				: newMatches;

			if (repairMode && invalidDomainIds && finalMatches.length === 0 && newMatches.length > 0) {
				const matchedIds = newMatches.map((m) => m.domainId);
				const invalidArr = Array.from(invalidDomainIds);
				setInfoMessage(
					`Matched ${newMatches.length} domains, but none overlap with the ${invalidDomainIds.size} invalid ones. ` +
					`Invalid IDs: [${invalidArr.join(", ")}]. Your matched IDs include: [${matchedIds.slice(0, 10).join(", ")}${matchedIds.length > 10 ? "…" : ""}]`
				);
			}

			setMatches(finalMatches);
			setUnmatched(newUnmatched);
			setPhase("matched");
		} catch (err: any) {
			setError(err?.message || "Failed to fetch domain lookup");
			setPhase("idle");
		}
	};

	const handleUpload = async () => {
		setPhase("uploading");
		setError(null);
		setUploadProgress(0);

		// Split matches into chunks
		const chunks: FileMatch[][] = [];
		for (let i = 0; i < matches.length; i += batchSize) {
			chunks.push(matches.slice(i, i + batchSize));
		}
		setBatchProgress({ current: 0, total: chunks.length });

		const aggregated: BatchMetadataUpdateResult = {
			dryRun: false,
			totalFilesScanned: 0,
			matchedCount: 0,
			unmatchedCount: 0,
			succeededCount: 0,
			failedCount: 0,
			matched: [],
			unmatchedFiles: [],
			errors: [],
		};

		try {
			for (let ci = 0; ci < chunks.length; ci++) {
				const chunk = chunks[ci];
				setBatchProgress({ current: ci + 1, total: chunks.length });

				const formData = new FormData();
				const mappings: { fileName: string; domainId: number }[] = [];

				for (const m of chunk) {
					formData.append("metadataFiles", m.file, m.file.name);
					mappings.push({ fileName: m.file.name, domainId: m.domainId });

					if (includeMeshes && m.companionMesh) {
						formData.append("meshFiles", m.companionMesh, m.companionMesh.name);
					}
				}

				formData.append("mappingsJson", JSON.stringify(mappings));
				formData.append("includeMeshes", String(includeMeshes));

				const res = await agent.Admin.batchUploadMetadata(formData, (evt) => {
					const total = evt.total ?? 0;
					if (total > 0) {
						const chunkProgress = evt.loaded / total;
						const overallProgress = (ci + chunkProgress) / chunks.length;
						setUploadProgress(Math.round(overallProgress * 100));
					}
				});

				const d = res.data;
				aggregated.totalFilesScanned += d.totalFilesScanned;
				aggregated.matchedCount += d.matchedCount;
				aggregated.unmatchedCount += d.unmatchedCount;
				aggregated.succeededCount += d.succeededCount;
				aggregated.failedCount += d.failedCount;
				aggregated.matched.push(...d.matched);
				aggregated.unmatchedFiles.push(...d.unmatchedFiles);
				aggregated.errors.push(...d.errors);
			}

			setResult(aggregated);
			setPhase("done");
			onBatchComplete?.();
		} catch (err: any) {
			// Show partial results if some batches succeeded
			if (aggregated.succeededCount > 0) {
				aggregated.errors.push(`Upload stopped at batch ${batchProgress.current}/${chunks.length}: ${err?.message || "Unknown error"}`);
				setResult(aggregated);
				setPhase("done");
				onBatchComplete?.();
			} else {
				setError(err?.message || "Upload failed");
				setPhase("matched");
			}
		}
	};

	const handleReset = () => {
		setDroppedFiles([]);
		setPhase("idle");
		setMatches([]);
		setUnmatched([]);
		setResult(null);
		setError(null);
		setUploadProgress(0);
		setBatchProgress({ current: 0, total: 0 });
		setRepairMode(false);
		setInvalidDomainIds(null);
		setInfoMessage(null);
	};

	const metadataCount = droppedFiles.filter((f) => f.name.endsWith("_metadata.json")).length;
	const glbCount = droppedFiles.filter((f) => f.name.toLowerCase().endsWith(".glb")).length;
	const isWorking = phase === "matching" || phase === "uploading";
	const matchedWithMesh = matches.filter((m) => m.companionMesh).length;

	return (
		<div className="border rounded-lg bg-white shadow p-6">
			<h2 className="text-lg font-semibold mb-4">Batch Metadata Update</h2>

			{/* Dropzone */}
			{(phase === "idle" || phase === "matched") && (
				<div
					{...getRootProps()}
					className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center cursor-pointer transition-colors ${
						isDragActive
							? "border-blue-400 bg-blue-50"
							: "border-gray-300 hover:border-gray-400"
					}`}
				>
					<input {...getInputProps()} />
					{isDragActive ? (
						<p className="text-blue-600 text-sm">Drop files here...</p>
					) : (
						<div className="text-sm text-gray-500">
							<p className="font-medium text-gray-700">
								Drag & drop metadata files here
							</p>
							<p className="mt-1">
								Accepts <code>*_metadata.json</code> and optional{" "}
								<code>.glb</code> files
							</p>
						</div>
					)}
				</div>
			)}

			{/* File list */}
			{droppedFiles.length > 0 && phase !== "done" && (
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm text-gray-600">
							{metadataCount} metadata file{metadataCount !== 1 && "s"}, {glbCount}{" "}
							mesh file{glbCount !== 1 && "s"}
						</span>
						{phase === "idle" && (
							<button
								type="button"
								onClick={() => setDroppedFiles([])}
								className="text-xs text-red-500 hover:underline"
							>
								Clear all
							</button>
						)}
					</div>
					{phase === "idle" && (
						<div className="max-h-40 overflow-y-auto border rounded bg-gray-50 p-2 text-xs font-mono space-y-0.5">
							{droppedFiles.map((f) => (
								<div key={f.name} className="flex justify-between items-center">
									<span className="truncate">{f.name}</span>
									<button
										type="button"
										onClick={() => removeFile(f.name)}
										className="text-red-400 hover:text-red-600 ml-2 shrink-0"
									>
										×
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Repair mode banner */}
			{repairMode && invalidDomainIds && (
				<div className="mb-4 border border-amber-300 rounded-lg bg-amber-50 p-3 flex items-center justify-between">
					<div className="text-sm">
						<span className="font-medium text-amber-800">Repair mode:</span>{" "}
						<span className="text-amber-700">
							{invalidDomainIds.size} domain{invalidDomainIds.size !== 1 && "s"} with invalid meshes detected.
							Only these will be re-uploaded.
						</span>
					</div>
					<button
						type="button"
						onClick={exitRepairMode}
						className="text-xs text-amber-600 hover:text-amber-800 underline ml-4 shrink-0"
						disabled={isWorking}
					>
						Exit repair mode
					</button>
				</div>
			)}

			{/* Options */}
			{(phase === "idle" || phase === "matched") && (
				<div className="mb-4 flex flex-wrap gap-6">
					<label className="flex items-center gap-2 text-sm">
						Category:
						<select
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value as "Particles" | "Pores")}
							disabled={isWorking}
							className="border rounded px-2 py-1 text-sm"
						>
							<option value="Particles">Particles</option>
							<option value="Pores">Pores</option>
						</select>
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={includeMeshes}
							onChange={(e) => setIncludeMeshes(e.target.checked)}
							disabled={isWorking || repairMode}
						/>
						Include companion meshes (.glb)
						{repairMode && <span className="text-xs text-amber-600">(forced on in repair mode)</span>}
					</label>
					<label className="flex items-center gap-2 text-sm">
						Batch size:
						<input
							type="number"
							min={1}
							value={batchSize}
							onChange={(e) => setBatchSize(e.target.value === "" ? 1 : parseInt(e.target.value) || 1)}
							disabled={isWorking}
							className="border rounded px-2 py-1 text-sm w-20"
						/>
					</label>
				</div>
			)}

			{/* Error */}
			{error && <p className="mb-4 text-sm text-red-600">{error}</p>}
			{infoMessage && <p className="mb-4 text-sm text-green-600">{infoMessage}</p>}

			{/* Mapper table */}
			{phase === "matched" && matches.length === 0 && unmatched.length === 0 && (
				<div className="mb-4 text-sm text-gray-500">
					No matches found. {repairMode && "None of your dropped files matched the invalid domains."}
				</div>
			)}
			{phase === "matched" && (matches.length > 0 || unmatched.length > 0) && (
				<div className="mb-4 space-y-3">
					<div className="flex gap-6 text-sm">
						<span className="text-green-600">
							Matched: <strong>{matches.length}</strong>
						</span>
						<span className="text-amber-600">
							Unmatched: <strong>{unmatched.length}</strong>
						</span>
						{includeMeshes && (
							<span className="text-blue-600">
								With mesh: <strong>{matchedWithMesh}</strong>
							</span>
						)}
						{repairMode && (
							<span className="text-amber-600">
								(repair mode — only invalid meshes)
							</span>
						)}
					</div>

					<div className="border rounded bg-gray-50 overflow-x-auto max-h-[420px] overflow-y-auto">
						<table className="w-full text-xs">
							<thead className="sticky top-0">
								<tr className="border-b bg-gray-100 text-left">
									<th className="px-3 py-2">File</th>
									<th className="px-3 py-2">Matched To (DB)</th>
									<th className="px-3 py-2">Domain</th>
									<th className="px-3 py-2">Scaffold</th>
									<th className="px-3 py-2">Action</th>
									<th className="px-3 py-2">Status</th>
								</tr>
							</thead>
							<tbody>
								{matches.map((m) => (
									<tr key={m.file.name} className="border-b">
										<td className="px-3 py-1.5 font-mono truncate max-w-[220px]" title={m.file.name}>
											{m.file.name.replace("_metadata.json", "")}
										</td>
										<td className="px-3 py-1.5 font-mono truncate max-w-[220px] text-gray-500" title={m.originalFileName}>
											{m.originalFileName}
										</td>
										<td className="px-3 py-1.5">{m.domainId}</td>
										<td className="px-3 py-1.5">{m.scaffoldId}</td>
										<td className="px-3 py-1.5 space-x-1">
											{m.hasExistingMetadata ? (
												<span className="text-amber-600" title="Domain already has metadata — will be overwritten">overwrite metadata</span>
											) : (
												<span className="text-green-600">new metadata</span>
											)}
											{includeMeshes && m.companionMesh && (
												<span className="text-blue-500" title="Companion .glb will replace existing mesh">+mesh</span>
											)}
										</td>
										<td className="px-3 py-1.5">
											<span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
											matched
										</td>
									</tr>
								))}
								{unmatched.map((u) => (
									<tr key={u.file.name} className="border-b bg-amber-50/50">
										<td className="px-3 py-1.5 font-mono truncate max-w-[220px] text-amber-700" title={u.file.name}>
											{u.file.name.replace("_metadata.json", "")}
										</td>
										<td className="px-3 py-1.5 text-gray-400">—</td>
										<td className="px-3 py-1.5 text-gray-400">—</td>
										<td className="px-3 py-1.5 text-gray-400">—</td>
										<td className="px-3 py-1.5 text-gray-400">—</td>
										<td className="px-3 py-1.5">
											<span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />
											<span className="text-amber-600">no match</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Upload progress */}
			{phase === "uploading" && (
				<div className="mb-4">
					<div className="w-full bg-gray-200 rounded-full h-3">
						<div
							className="bg-blue-600 h-3 rounded-full transition-all duration-300"
							style={{ width: `${uploadProgress}%` }}
						/>
					</div>
					<p className="text-xs text-gray-500 mt-1">
						Uploading batch {batchProgress.current}/{batchProgress.total}… {uploadProgress}%
					</p>
				</div>
			)}

			{phase === "matching" && (
				<div className="mb-4">
					<div className="w-full bg-gray-200 rounded-full h-3">
						<div className="bg-blue-600 h-3 rounded-full animate-pulse" style={{ width: "100%" }} />
					</div>
					<p className="text-xs text-gray-500 mt-1">Matching files to domains…</p>
				</div>
			)}

			{/* Done result */}
			{phase === "done" && result && (
				<div className="mb-4 space-y-2 text-sm">
					<p className="text-green-600 font-medium">Batch metadata upload complete.</p>
					<div className="flex gap-6">
						<span>
							Scanned: <strong>{result.totalFilesScanned}</strong>
						</span>
						<span className="text-green-700">
							Succeeded: <strong>{result.succeededCount}</strong>
						</span>
						<span className="text-red-600">
							Failed: <strong>{result.failedCount}</strong>
						</span>
					</div>
					{result.errors.length > 0 && (
						<div className="p-2 border border-red-200 rounded bg-red-50 text-xs text-red-700 max-h-32 overflow-y-auto">
							{result.errors.map((e, i) => (
								<div key={i}>{e}</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Action buttons */}
			<div className="flex gap-3">
				{phase === "idle" && (
					<>
						<button
							type="button"
							onClick={handleMatch}
							className="px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-40"
							disabled={metadataCount === 0}
						>
							{repairMode ? "Match & Filter Invalid" : "Match Files"}
						</button>
						{!repairMode && (
							<button
								type="button"
								onClick={handleCheckInvalid}
								className="px-4 py-2 border border-amber-400 text-amber-700 text-sm rounded-md hover:bg-amber-50 disabled:opacity-40"
								disabled={checkingInvalid}
							>
								{checkingInvalid ? "Checking…" : "Check Invalid Meshes"}
							</button>
						)}
					</>
				)}
				{phase === "matched" && matches.length > 0 && (
					<button
						type="button"
						onClick={handleUpload}
						className="px-4 py-2 bg-green-700 text-white text-sm rounded-md hover:bg-green-600"
					>
						Apply {matches.length} Update{matches.length !== 1 && "s"}
					</button>
				)}
				{phase === "matched" && (
					<button
						type="button"
						onClick={() => { setPhase("idle"); setMatches([]); setUnmatched([]); }}
						className="px-4 py-2 border text-sm rounded-md hover:bg-gray-50"
					>
						Back
					</button>
				)}
				{phase === "done" && (
					<button
						type="button"
						onClick={handleReset}
						className="px-4 py-2 border text-sm rounded-md hover:bg-gray-50"
					>
						Reset
					</button>
				)}
			</div>
		</div>
	);
};

export default BatchMetadataPanel;
