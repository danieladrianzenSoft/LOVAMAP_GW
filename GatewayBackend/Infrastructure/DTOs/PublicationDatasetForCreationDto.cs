
using System.Text.Json;
using Data.Models;

namespace Infrastructure.DTOs
{
	public class PublicationDatasetForCreationDto
	{
		public int PublicationId { get; set; }
		public string Name { get; set; } = "Main";
		public ICollection<int> ScaffoldIds { get; set; } = [];
		public ICollection<PublicationDatasetDescriptorRuleDto> DescriptorRules { get; set; } = [];
	}
}