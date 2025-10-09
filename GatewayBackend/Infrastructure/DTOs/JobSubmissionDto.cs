
using System.Text.Json;
using Infrastructure.Helpers;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	[ExactlyOneFileRequired]
	public class JobSubmissionDto
	{
		public IFormFile? CsvFile { get; set; }
		public IFormFile? DatFile { get; set; }
		public IFormFile? JsonFile { get; set; }
		public Guid? JobId { get; set; }
		public string? Dx { get; set; }
		public string? CreatorId { get; set; }
	}
}

