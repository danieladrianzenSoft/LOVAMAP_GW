
using System.Text.Json;

namespace Data.Models
{
	public class OtherDescriptor
	{
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
		public int DescriptorTypeId { get; set; }
		public DescriptorType DescriptorType { get; set; } = null!;
		public JsonDocument Values { get; set; } = null!;

	}
}
