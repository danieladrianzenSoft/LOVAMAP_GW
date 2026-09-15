
namespace Data.Models
{
	public class ContentPage
	{
		public int Id { get; set; }
		public string Slug { get; set; } = null!;
		public string Title { get; set; } = null!;
		public string Area { get; set; } = null!;
		public string? Description { get; set; }
		public bool ComingSoon { get; set; } = false;
		public int SortOrder { get; set; } = 0;
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public DateTime? UpdatedAt { get; set; }
		public virtual ICollection<ContentSection> Sections { get; set; } = new List<ContentSection>();
	}
}
