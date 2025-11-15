
namespace Data.Models
{
	public class PublicationDataset
	{
		public int Id { get; set; }
		public int PublicationId { get; set; }
		public Publication Publication { get; set; } = null!;
		public string Name { get; set; } = "Main";
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public ICollection<PublicationDatasetScaffold> PublicationDatasetScaffolds { get; set; } = [];
		public ICollection<PublicationDatasetDescriptorRule> PublicationDatasetDescriptorRules { get; set; } = [];
		public ICollection<PublicationDatasetVersion> PublicationDatasetVersions { get; set; } = [];
	}
}