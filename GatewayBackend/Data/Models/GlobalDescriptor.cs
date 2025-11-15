
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Data.Models
{
	public class GlobalDescriptor
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
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string? ValueString { get; set; }
		public int? ValueInt { get; set; }
		public double? ValueDouble { get; set; }
	}
}
