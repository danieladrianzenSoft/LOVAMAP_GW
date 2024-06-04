using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class DescriptorDto
	{
		public string Name { get; set; } = null!;
		public string Label { get; set; } = null!;
		public string? Unit { get; set; }
		public string? Values { get; set; } 
		
	}
}