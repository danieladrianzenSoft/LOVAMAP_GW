import React, { useEffect, useState } from "react";
import agent from "../../../app/api/agent";
import { DomainSummary } from "../../../app/models/domainManager";

const DomainSummaryPanel: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
	const [summary, setSummary] = useState<DomainSummary | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		agent.Admin.getDomainSummary()
			.then((res) => setSummary(res.data))
			.catch(console.error)
			.finally(() => setLoading(false));
	}, [refreshKey]);

	if (loading) return <p className="text-sm text-gray-500">Loading summary…</p>;
	if (!summary) return <p className="text-sm text-red-500">Failed to load summary.</p>;

	const stats = [
		{ label: "Total Domains", value: summary.totalDomains },
		{ label: "With Mesh", value: summary.withMesh },
		{ label: "With Metadata", value: summary.withMetadata },
		{ label: "Without Metadata", value: summary.withoutMetadata, highlight: summary.withoutMetadata > 0 },
		{ label: "Particles", value: summary.particleCount },
		{ label: "Pores", value: summary.poreCount },
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
			{stats.map((s) => (
				<div
					key={s.label}
					className={`border rounded-lg p-4 text-center ${
						s.highlight ? "bg-amber-50 border-amber-300" : "bg-white"
					}`}
				>
					<p className="text-2xl font-bold">{s.value}</p>
					<p className="text-xs text-gray-500 mt-1">{s.label}</p>
				</div>
			))}
		</div>
	);
};

export default DomainSummaryPanel;
