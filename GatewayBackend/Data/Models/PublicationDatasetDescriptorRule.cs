
namespace Data.Models
{
	public class PublicationDatasetDescriptorRule
	{
		public int PublicationDatasetId { get; set; }
		public PublicationDataset PublicationDataset { get; set; } = null!;
		public int DescriptorTypeId { get; set; }
		public DescriptorType DescriptorType { get; set; } = null!;
		public JobSelectionMode JobMode { get; set; } = JobSelectionMode.LatestForScaffold;
		public Guid? JobId { get; set; } // required if JobMode == SpecificJob
	}

	public enum JobSelectionMode
	{
		LatestForScaffold = 0,     // choose the latest row for that (scaffold, type), job-aware if available
		SpecificJob = 1,           // pick rows from a specific JobId only
		LatestRegardlessOfJob = 2, // ignore Job boundaries; just pick the newest row
		LegacyNoJobOnly = 3  
	}
}