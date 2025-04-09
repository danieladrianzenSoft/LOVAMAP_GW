
namespace Data.Models
{
    public class Domain
	{
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
		public DomainCategory Category { get; set; }
		public double VoxelSize { get; set; }
		public int VoxelCount { get; set; }
		public required string DomainSize { get; set; }
		public string? MeshFilePath { get; set; }
		public byte[]? Mesh { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public DomainSource DomainSource { get; set; }
		public string? SegmentationVersion { get; set; }
		public Job? InputToJob { get; set; }
		public Guid? ProducedByJobId { get; set; }
		public Job? ProducedByJob { get; set; }
	}

	public enum DomainSource 
	{
		Upload,
		Segmentation
	}
	
	public enum DomainCategory
	{
		Particle,  // Particle mesh
		Pore,      // Void space mesh
		Other      // Future expansion
	}
}
