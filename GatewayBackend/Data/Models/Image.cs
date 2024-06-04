
namespace Data.Models
{
	public class Image
	{
		public int Id { get; set; }
        public string Url { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string PublicId { get; set; } = null!;
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
		public bool IsThumbnail { get; set; } = false;


	}
}
