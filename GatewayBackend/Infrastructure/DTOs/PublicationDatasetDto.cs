
using System.Text.Json;
using Data.Models;

namespace Infrastructure.DTOs
{
	public class PublicationDatasetDto
	{
		public int Id { get; init; }
		public int PublicationId { get; init; }
		public string Name { get; init; } = null!;
		public int ScaffoldCount { get; init; }
		public int RuleCount { get; init; }
		public DateTime CreatedAt { get; set; }
		public IEnumerable<int> ScaffoldIds { get; set; } = [];
		public IEnumerable<PublicationDatasetDescriptorRuleDto> DescriptorRules { get; set; } = [];
	}
}