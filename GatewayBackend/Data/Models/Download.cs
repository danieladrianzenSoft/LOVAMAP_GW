
namespace Data.Models
{
	public class Download
	{
		public int Id { get; set; }
		public string DownloaderId { get; set; } = null!;
		public User Downloader { get; set; } = null!;	
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public ICollection<DescriptorTypeDownload> DescriptorTypeDownloads { get; set; } = new List<DescriptorTypeDownload>();
		public ICollection<ScaffoldDownload> ScaffoldDownloads { get; set; } = new List<ScaffoldDownload>();

	}
}
