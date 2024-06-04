using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IRoleService
	{
		Task CreateRoles(IEnumerable<RoleToCreateDto> roles);
		Task AddToRole(User user, string role);

	}
}