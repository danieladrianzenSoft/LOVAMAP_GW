
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class DomainToVisualizeDto
	{
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public int Category { get; set; }
		public int VoxelCount { get; set; }
		public double VoxelSize { get; set; }
		public required string DomainSize { get; set; }
		public required string MeshFilePath { get; set; }
	}
}