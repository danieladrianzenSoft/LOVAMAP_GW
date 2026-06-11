using System.ComponentModel.DataAnnotations;

namespace Infrastructure.DTOs
{
	public class LovamapFromSourceJobDto
	{
		[Required]
		public Guid SourceJobId { get; set; }  // GW job ID of the completed segmentation job
		public string? Dx { get; set; }
		public bool GenerateMesh { get; set; } = true;
		public string? CreatorId { get; set; }  // set by controller
	}
}
