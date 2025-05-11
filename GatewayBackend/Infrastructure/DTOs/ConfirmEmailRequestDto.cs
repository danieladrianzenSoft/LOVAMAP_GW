
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class ConfirmEmailRequestDto
	{
		[Required]
    	[EmailAddress]
		public required string Email { get; set; }
	}
}