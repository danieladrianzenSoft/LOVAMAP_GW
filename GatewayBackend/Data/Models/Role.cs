using Microsoft.AspNetCore.Identity;

namespace Data.Models
{
	public class Role : IdentityRole
	{
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	}
}