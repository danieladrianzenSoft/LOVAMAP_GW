
namespace Infrastructure.DTOs
{
	public class DescriptorTypeToCreateDto
	{
		public required string Name { get; set; }
		public required string Label { get; set; }
		public required string TableLabel { get; set; }
		public required string Category { get; set; }
		public required string SubCategory { get; set; }
		public string? ImageUrl { get; set; }
		public string? Comments { get; set; }
		public string? Unit { get; set; }
		public required string DataType { get; set; }
		public string? Description { get; set; }
		public int? PublicationId { get; set; }

	}
}