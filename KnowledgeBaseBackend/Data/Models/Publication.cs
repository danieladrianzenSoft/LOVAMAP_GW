namespace KnowledgeBaseApi.Data.Models
{
	public class Publication
	{
		public int Id { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string Title { get; set; } = null!;
		public string Authors { get; set; } = null!;
		public string Journal { get; set; } = null!;
		public string Doi { get; set; } = null!;
		public DateTime PublishedAt { get; set; }
		public string? Citation { get; set; }
	}
}
