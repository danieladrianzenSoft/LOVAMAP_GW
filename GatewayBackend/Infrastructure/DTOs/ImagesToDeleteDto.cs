
using System.ComponentModel.DataAnnotations;
using Data.Models;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class ImagesToDeleteDto
    {
		public List<int> ImageIds { get; set; } = [];
	}
}