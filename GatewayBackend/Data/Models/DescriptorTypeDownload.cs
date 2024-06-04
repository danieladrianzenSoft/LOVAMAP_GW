
namespace Data.Models
{
	public class DescriptorTypeDownload
	{
		public int Id { get; set; }
		public int DownloadId { get; set; }
		public Download Download { get; set; } = null!;	
		public int DescriptorTypeId { get; set; }
		public DescriptorType DescriptorType { get; set; } = null!;	

	}
}
