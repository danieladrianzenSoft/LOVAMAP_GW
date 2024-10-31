using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class ImageToUpdateDto
    {
        public int Id { get; set; }
        public string Category { get; set; } = string.Empty;
		public int ScaffoldGroupId { get; set; }
		public int? ScaffoldId { get; set; } = null;
        public bool IsThumbnail { get; set; } = false;

    }
}