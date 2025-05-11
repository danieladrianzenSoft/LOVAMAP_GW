
using System.ComponentModel.DataAnnotations;

namespace Infrastructure.DTOs
{
	public class ChangePasswordDto
	{
		[Required]
		public required string OldPassword { get; set; }
		[Required]
		public required string NewPassword { get; set; }
	}
}