
namespace Data.Models
{
    public class DescriptorType
	{
		public int Id { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string Name { get; set; } = null!;
		public string Label { get; set; } = null!;
		public string TableLabel { get; set; } = null!;
		public string Category { get; set; } = null!;
		public string? SubCategory { get; set; }
		public string? Comments { get; set; }
		public string? Unit { get; set; }
		public string DataType { get; set; } = null!;
		public string? ImageUrl { get; set; }
		public string? Description { get; set; }
		public int? PublicationId { get; set; } 
		public Publication? Publication { get; set; }
		public ICollection<GlobalDescriptor> GlobalDescriptors { get; set; } = new List<GlobalDescriptor>();
    	public ICollection<PoreDescriptor> PoreDescriptors { get; set; } = new List<PoreDescriptor>();
   	 	public ICollection<OtherDescriptor> OtherDescriptors { get; set; } = new List<OtherDescriptor>();
		public virtual ICollection<DescriptorTypeDownload> DescriptorTypeDownloads { get; set; } = new List<DescriptorTypeDownload>();

	}
}
