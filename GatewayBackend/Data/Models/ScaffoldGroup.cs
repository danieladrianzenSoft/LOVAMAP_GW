
namespace Data.Models
{
	public class ScaffoldGroup
	{
		public int Id { get; set; }
		public string Name { get; set; } = null!;
		public string? UploaderId { get; set; }
		public User? Uploader { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public DateTime? UpdatedAt { get; set; } = null;
		public bool IsPublic { get; set; } = false;
		public bool IsSimulated { get; set; } = false;
		public string? Comments { get; set; }
		public string? OriginalFileName { get; set; }
		public InputGroup InputGroup { get; set; } = null!;
		public virtual ICollection<Scaffold> Scaffolds { get; set; } = new List<Scaffold>();
		public virtual ICollection<Image> Images { get; set; } = new List<Image>();
		public virtual ICollection<ScaffoldGroupPublication> ScaffoldGroupPublications { get; set; } = new List<ScaffoldGroupPublication>();

	}
}
