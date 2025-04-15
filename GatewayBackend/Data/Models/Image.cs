
namespace Data.Models
{
	public class Image
	{
		public int Id { get; set; }
        public string Url { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string PublicId { get; set; } = null!;
		public bool IsThumbnail { get; set; } = false;
		public ImageCategory Category { get; set; } = 0;
		public int ScaffoldGroupId { get; set; }
		public ScaffoldGroup ScaffoldGroup {get; set; } = null!;
		public int? ScaffoldId { get; set; }
		public virtual Scaffold? Scaffold { get; set; } 
		public string UploaderId { get; set; } = null!;
		public virtual User Uploader { get; set; } = null!;

	}

	public enum ImageCategory 
	{
		Particles = 0,
		ExteriorPores = 1,
		InteriorPores = 2,
		ParticleSizeDistribution = 3,
		Other = 4
	}
}
