
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class ImageToShowDto
    {
        public int Id { get; set; }
        public string Url { get; set; } = "";
        public string PublicId { get; set; } = "";
		public bool IsThumbnail { get; set; } = false;
		public string Category { get; set; } = "";
    }
}