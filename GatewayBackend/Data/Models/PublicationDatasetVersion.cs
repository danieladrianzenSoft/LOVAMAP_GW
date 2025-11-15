namespace Data.Models
{
	public class PublicationDatasetVersion
	{
		public int Id { get; set; }
		public int PublicationDatasetId { get; set; }
		public PublicationDataset PublicationDataset { get; set; } = null!;
		public int Version { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string? ExportPath { get; set; }
		public string? ExportSha256 { get; set; }
		public string? Description { get; set; }
		public ICollection<PublicationDatasetFrozenDescriptor> PublicationDatasetFrozenDescriptors { get; set; } = [];
	}
}
