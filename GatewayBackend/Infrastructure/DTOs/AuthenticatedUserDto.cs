
namespace Infrastructure.DTOs
{
	public class AuthenticatedUserDto
	{
		public string Id { get; set; }
		public string Email { get; set; }
		public string AccessToken { get; set; }
		public ICollection<string> Roles { get; set; } = [];
	}
}


