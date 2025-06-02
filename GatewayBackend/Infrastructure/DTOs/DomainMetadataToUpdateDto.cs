using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class DomainMetadataToUpdateDto
	{
		public required int DomainId { get; set; }
		public IFormFile? MetadataFile { get; set; }       // Optional
		public string? MetadataJson { get; set; }
	}
}