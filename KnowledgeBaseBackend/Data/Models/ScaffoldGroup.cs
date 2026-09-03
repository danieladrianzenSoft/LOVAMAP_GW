namespace KnowledgeBaseApi.Data.Models
{
	public class ScaffoldGroup
	{
		public int Id { get; set; }
		public string Name { get; set; } = null!;
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public DateTime? UpdatedAt { get; set; }
		public bool IsPublic { get; set; } = false;
		public bool IsSimulated { get; set; } = false;
		public string? Comments { get; set; }
		public string? OriginalFileName { get; set; }
		public virtual ICollection<Scaffold> Scaffolds { get; set; } = new List<Scaffold>();
	}
}
