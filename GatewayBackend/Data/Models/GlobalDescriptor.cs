
namespace Data.Models
{
	public class GlobalDescriptor
	{
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
		public int DescriptorTypeId { get; set; }
		public DescriptorType DescriptorType { get; set; } = null!;
		public string? ValueString { get; set; }
		public int? ValueInt { get; set; }
		public double? ValueDouble { get; set; }

	}
}
