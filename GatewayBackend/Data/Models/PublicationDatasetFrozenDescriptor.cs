
namespace Data.Models
{
	public class PublicationDatasetFrozenDescriptor
	{
		public int PublicationDatasetVersionId { get; set; }
		public PublicationDatasetVersion PublicationDatasetVersion { get; set; } = null!;
		public int ScaffoldId { get; set; }
		public int DescriptorTypeId { get; set; }
		public int? GlobalDescriptorId { get; set; }
		public int? PoreDescriptorId { get; set; }
		public int? OtherDescriptorId { get; set; }
		public Guid? JobId { get; set; }
	}
}