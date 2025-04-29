
namespace Infrastructure.DTOs
{
	public class ScaffoldTagToCreateDto
	{
		public int? TagId { get; set; }
		public required string Name { get; set; }
		public string? ReferenceProperty { get; set; }

	}
}
