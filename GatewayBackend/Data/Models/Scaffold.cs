
namespace Data.Models
{
	public class Scaffold
	{
		public int Id { get; set; }
		public int ReplicateNumber { get; set; } = 1;
		public int ScaffoldGroupId { get; set; }
		public string? DescriptorSource { get; set; }
		public string? DescriptorSourceVersion { get; set; }
		public ScaffoldGroup ScaffoldGroup { get; set; } = null!;
		public ICollection<ScaffoldTag> ScaffoldTags { get; set; } = new List<ScaffoldTag>();
		public virtual ICollection<Domain> Domains { get; set; } = new List<Domain>();
		public virtual ICollection<Image> Images { get; set; } = new List<Image>();
		public virtual ICollection<GlobalDescriptor> GlobalDescriptors { get; set; } = new List<GlobalDescriptor>();
		public virtual ICollection<PoreDescriptor> PoreDescriptors { get; set; } = new List<PoreDescriptor>();
		public virtual ICollection<OtherDescriptor> OtherDescriptors { get; set; } = new List<OtherDescriptor>();
		public virtual ICollection<ScaffoldDownload> ScaffoldDownloads { get; set; } = new List<ScaffoldDownload>();

	}
}