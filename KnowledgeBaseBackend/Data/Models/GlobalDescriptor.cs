using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KnowledgeBaseApi.Data.Models
{
	public class GlobalDescriptor
	{
		[Key]
		[DatabaseGenerated(DatabaseGeneratedOption.Identity)]
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string? ValueString { get; set; }
		public int? ValueInt { get; set; }
		public double? ValueDouble { get; set; }
	}
}
