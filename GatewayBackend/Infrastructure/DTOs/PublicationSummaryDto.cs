
namespace Infrastructure.DTOs
{
	public class PublicationSummaryDto
	{
		public int Id { get; set; }
		public string Title { get; set; } = null!;
		public string Authors { get; set; } = null!;
		public string Journal { get; set; } = null!;
		public DateTime PublishedAt { get; set; }
		public string Doi { get; set; } = null!;
		public string? Citation { get; set; }
		public List<int> ScaffoldGroupIds { get; set; } = [];
    	public List<int> DescriptorTypeIds { get; set; } = [];
	}
}

