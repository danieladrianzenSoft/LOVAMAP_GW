
namespace Data.Models
{
	public class ContentSection
	{
		public int Id { get; set; }
		public int ContentPageId { get; set; }
		public ContentPage ContentPage { get; set; } = null!;
		public string? Title { get; set; }
		public string Body { get; set; } = "";
		public int SortOrder { get; set; } = 0;
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public DateTime? UpdatedAt { get; set; }
	}
}
