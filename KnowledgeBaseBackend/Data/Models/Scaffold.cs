namespace KnowledgeBaseApi.Data.Models
{
	public class Scaffold
	{
		public int Id { get; set; }
		public int ReplicateNumber { get; set; } = 1;
		public int ScaffoldGroupId { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string? Comments { get; set; }
		public ScaffoldGroup ScaffoldGroup { get; set; } = null!;
		public virtual ICollection<GlobalDescriptor> GlobalDescriptors { get; set; } = new List<GlobalDescriptor>();
	}
}
