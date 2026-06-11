using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class MeshJobSubmissionDto
	{
		[Required]
		public IFormFile File { get; set; } = null!;

		[Required]
		public string MeshWorkflow { get; set; } = null!; // "mesh_generation" or "unite_meshes"

		public string? CreatorId { get; set; } // set by controller
	}
}
