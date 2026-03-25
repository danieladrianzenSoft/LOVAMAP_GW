import { useNavigate } from "react-router-dom";
import AdminBatchThumbnailGenerator from "./admin-batch-thumbnail-generator";
import AdminBatchImageCleanup from "./admin-batch-image-cleanup";
import AdminTitleResetter from "./admin-title-resetter";
import AdminBatchDescriptorSeeder from "./admin-batch-descriptor-seeder";

const AdminUtilities: React.FC = () => {
	const navigate = useNavigate();

	return (
		<div className="container mx-auto mt-10 px-4 lg:px-8">
			<h1 className="text-2xl font-bold mb-6">Admin Utilities</h1>
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
				<AdminBatchThumbnailGenerator />
				<AdminBatchImageCleanup />
				<AdminTitleResetter />
				<AdminBatchDescriptorSeeder />
			</div>
		</div>
	);
};

export default AdminUtilities;