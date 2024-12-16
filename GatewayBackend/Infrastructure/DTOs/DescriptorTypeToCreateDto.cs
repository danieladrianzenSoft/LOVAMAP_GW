
namespace Infrastructure.DTOs
{
	public class DescriptorTypeToCreateDto
	{
		public string Name { get; set; }
		public string Label { get; set; }
		public string TableLabel { get; set; }
		public string Category { get; set; }
		public string SubCategory { get; set; }
		public string? ImageUrl { get; set; }
		public string? Comments { get; set; }
		public string? Unit { get; set; }
		public string DataType { get; set; }
		public string Description { get; set; }
		public int? PublicationId { get; set; }

	}
}