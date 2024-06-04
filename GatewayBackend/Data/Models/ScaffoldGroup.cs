
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
		public int? PublicationId { get; set; }
		public Publication? Publication { get; set; }
		public InputGroup? InputGroup { get; set; }
		public virtual ICollection<Scaffold> Scaffolds { get; set; } = new List<Scaffold>();

	}
}
