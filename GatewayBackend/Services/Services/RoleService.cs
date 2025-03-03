
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Infrastructure.IHelpers;
using Services.IServices;

namespace Services.Services
{	public class RoleService : IRoleService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IUserAuthHelper _userAuthHelper;

		public RoleService(DataContext context, IModelMapper modelMapper, IUserAuthHelper userAuthHelper)
		{
			_context = context;
			_modelMapper = modelMapper;
			_userAuthHelper = userAuthHelper;
		}

		public async Task CreateRoles(IEnumerable<RoleToCreateDto> rolesToCreate)
		{
			try
			{
				var roles = rolesToCreate.Select(dto => _modelMapper.MapToRole(dto)).ToList();

				foreach (var role in roles)
				{
					if (role == null) continue;
					await _userAuthHelper.CreateRole(role);
				}

			}
			catch (Exception ex)
			{
				throw new ApplicationException("Error saving role", ex);
			}
			
		}

		public async Task AddToRole(User user, string role)
		{
			try
			{
				await _userAuthHelper.AddToRole(user, role);
			}
			catch (Exception ex)
			{
				throw new ApplicationException("Error adding user to role", ex);
			}
		}
	}
}


