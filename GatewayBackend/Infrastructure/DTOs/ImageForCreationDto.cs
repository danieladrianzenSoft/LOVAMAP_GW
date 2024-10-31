
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class ImageForCreationDto
    {
		public int ScaffoldGroupId { get; set; }
		public int? ScaffoldId { get; set; } = null;
		public string UploaderId { get; set; } = "";
        public string Url { get; set; } = "";
        public required IFormFile File { get; set; }
        public string PublicId { get; set; } = "";
        public bool IsThumbnail { get; set; } = false;

    }
}