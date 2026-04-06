import { useNavigate } from "react-router-dom";
import AdminThumbnailReset from "./admin-thumbnail-reset";
import AdminTitleResetter from "./admin-title-resetter";
import AdminBatchDescriptorSeeder from "./admin-batch-descriptor-seeder";

const AdminUtilities: React.FC = () => {
	const navigate = useNavigate();

	return (
		<div className="container mx-auto py-8 px-6">
			<h1 className="text-3xl text-gray-700 font-bold mb-12">Admin Utilities</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div className="border rounded-lg p-6 bg-white shadow flex flex-col justify-between">
					<div>
						<h2 className="text-lg font-semibold mb-2">Bulk Upload</h2>
						<p className="text-sm text-gray-600 mb-4">
							Upload descriptor files and domain meshes in a single workflow.
							Drop all files at once, review auto-organized results, and submit everything.
						</p>
					</div>
					<button
						onClick={() => navigate("/bulk-upload")}
						className="button-primary"
					>
						Open Bulk Upload
					</button>
				</div>
				<div className="border rounded-lg p-6 bg-white shadow flex flex-col justify-between">
					<div>
						<h2 className="text-lg font-semibold mb-2">Test Viewer</h2>
						<p className="text-sm text-gray-600 mb-4">
							Preview local GLB/metadata files without uploading to the database.
							Drop meshes to iterate on the full scene offline.
						</p>
					</div>
					<button
						onClick={() => navigate("/test-visualization")}
						className="button-primary"
					>
						Open Test Viewer
					</button>
				</div>
				<AdminThumbnailReset />
				<AdminTitleResetter />
				<AdminBatchDescriptorSeeder />
			</div>
		</div>
	);
};

export default AdminUtilities;