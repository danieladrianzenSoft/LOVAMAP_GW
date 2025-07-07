
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class PoreInfoScaffoldGroupDto
	{
		public int ScaffoldGroupId { get; set; }
		public List<PoreInfoScaffoldDto> Scaffolds { get; set; } = [];
		public List<DescriptorTypeDto> DescriptorTypes { get; set; } = [];
	}
}