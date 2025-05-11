
using System.ComponentModel.DataAnnotations;

namespace Infrastructure.DTOs
{
	public class ResetPasswordDto
	{
		[Required]
    	[EmailAddress]
		public required string Email { get; set; }
		[Required]
		public required string Token { get; set; }
		[Required]
		public required string NewPassword { get; set; }
	}
}