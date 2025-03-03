
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class DomainToCreateDto
	{
		public int ScaffoldId { get; set; }
		public int Category { get; set; }
		public required IFormFile MeshFile { get; set; }
		public int? VoxelCount { get; set; }
		public double? VoxelSize { get; set; }
		public string? DomainSize { get; set; }
	}
}