
using System.Text.Json;
using Data.Models;

namespace Infrastructure.DTOs
{
	public class PublicationDatasetDescriptorRuleDto
	{
		public int DescriptorTypeId { get; set; }
		public JobSelectionMode JobMode { get; set; } = JobSelectionMode.LatestForScaffold;
		public Guid? JobId { get; set; }
		public int PublicationDatasetId { get; set; }
	}
}