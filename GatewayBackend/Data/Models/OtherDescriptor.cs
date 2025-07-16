
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Data.Models
{
	public class OtherDescriptor
	{

		[Key]
		[DatabaseGenerated(DatabaseGeneratedOption.Identity)]
		public int Id { get; set; }
		public Guid? JobId { get; set; }
		public Job? Job { get; set; }
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
		public int DescriptorTypeId { get; set; }
		public DescriptorType DescriptorType { get; set; } = null!;
		public JsonDocument Values { get; set; } = null!;
	}
}
