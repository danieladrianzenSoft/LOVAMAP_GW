import React, { useCallback, useState } from "react";
import DomainSummaryPanel from "./domain-summary-panel";
import DomainBrowserTable from "./domain-browser-table";
import BatchMetadataPanel from "./batch-metadata-panel";

const DomainManagerPage: React.FC = () => {
	const [refreshKey, setRefreshKey] = useState(0);
	const handleBatchComplete = useCallback(() => setRefreshKey((k) => k + 1), []);

	return (
		<div className="container mx-auto py-8 px-6 space-y-8">
			<h1 className="text-3xl text-gray-700 font-bold">Domain Manager</h1>

			{/* Summary stats */}
			<DomainSummaryPanel refreshKey={refreshKey} />

			{/* Domain browser table */}
			<DomainBrowserTable refreshKey={refreshKey} />

			{/* Batch metadata update panel */}
			<BatchMetadataPanel onBatchComplete={handleBatchComplete} />
		</div>
	);
};

export default DomainManagerPage;
