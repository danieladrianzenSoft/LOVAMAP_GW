
namespace Data.Models
{
    public class Domain
	{
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public Scaffold Scaffold { get; set; } = null!;
		public DomainCategory Category { get; set; }
		public int VoxelCount { get; set; }
		public double VoxelSize { get; set; }
		public required string DomainSize { get; set; }
		public string? MeshFilePath { get; set; }
		public byte[]? Mesh { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string? Source { get; set; }
		public string? Version { get; set; }
	}
	
	
	public enum DomainCategory
	{
		Particle,  // Particle mesh
		Pore,      // Void space mesh
		Other      // Future expansion
	}
}
