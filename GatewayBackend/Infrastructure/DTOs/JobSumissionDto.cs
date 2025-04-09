
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
		public string? JobId { get; set; }
    	public string? Dx { get; set; }
	}
}

