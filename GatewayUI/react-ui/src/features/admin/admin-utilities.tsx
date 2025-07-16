import AdminBatchThumbnailGenerator from "./admin-batch-thumbnail-generator";
import AdminBatchImageCleanup from "./admin-batch-image-cleanup";
import AdminTitleResetter from "./admin-title-resetter";
import AdminBatchDescriptorSeeder from "./admin-batch-descriptor-seeder";

const AdminUtilities: React.FC = () => {
	return (
		<div className="container mx-auto mt-10 px-4 lg:px-8">
			<h1 className="text-2xl font-bold mb-6">Admin Utilities</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<AdminBatchThumbnailGenerator />
				<AdminBatchImageCleanup />
				<AdminTitleResetter />
				<AdminBatchDescriptorSeeder />
			</div>
		</div>
	);
};

export default AdminUtilities;