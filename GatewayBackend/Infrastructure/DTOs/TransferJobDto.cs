using System.ComponentModel.DataAnnotations;

namespace Infrastructure.DTOs
{
	public class TransferJobDto
	{
		[Required]
		public string TargetUserId { get; set; } = string.Empty;
	}
}
