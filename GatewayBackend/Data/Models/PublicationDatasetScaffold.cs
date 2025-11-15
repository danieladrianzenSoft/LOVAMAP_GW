
namespace Data.Models
{
	public class PublicationDatasetScaffold
	{
		public int PublicationDatasetId { get; set; }
		public PublicationDataset PublicationDataset { get; set; } = null!;
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
	}
}