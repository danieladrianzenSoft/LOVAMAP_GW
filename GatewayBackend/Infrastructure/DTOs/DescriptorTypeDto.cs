using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class DescriptorTypeDto
	{
		public int Id { get; set; }
		public string Name { get; set; } = null!;
		public string Label { get; set; } = null!;
		public string TableLabel { get; set; } = null!;
		public string Category { get; set; } = null!;
		public string? Unit { get; set; }
		public string DataType { get; set; } = null!;
		public string? Publication { get; set; }
		public string? Description { get; set; }
		public string? ImageUrl { get; set; }
		
	}
}