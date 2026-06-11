using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class SegmentationJobSubmissionDto
	{
		[Required]
		public IFormFile TifFile { get; set; } = null!;

		[Required]
		public string FluorescentLabel { get; set; } = null!; // "0" or "1"

		[Required]
		public string RadiusUm { get; set; } = null!; // particle radius in µm

		public string? Dx { get; set; } // pixel width µm (from metadata or user)
		public string? Dy { get; set; } // pixel height µm
		public string? Dz { get; set; } // pixel depth µm
		public string? CreatorId { get; set; } // set by controller
	}
}
