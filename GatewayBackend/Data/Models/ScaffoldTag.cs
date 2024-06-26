
namespace Data.Models
{
	public class ScaffoldTag
	{
		public int Id { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; }	= null!;
		public int TagId { get; set; }
		public Tag Tag { get; set; } = null!;
		public bool IsAutoGenerated { get; set; } = false;
		public bool IsPrivate { get; set; } = true;
		
	}
}
