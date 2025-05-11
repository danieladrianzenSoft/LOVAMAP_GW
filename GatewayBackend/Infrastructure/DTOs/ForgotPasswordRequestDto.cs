
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class ForgotPasswordRequestDto
	{
		[Required]
    	[EmailAddress]
		public required string Email { get; set; }
	}
}