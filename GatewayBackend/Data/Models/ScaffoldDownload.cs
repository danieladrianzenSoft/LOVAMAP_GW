
namespace Data.Models
{
	public class ScaffoldDownload
	{
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
		public int DownloadId { get; set; }
		public Download Download { get; set; } = null!;
		
	}
}
