using System.Text.Json;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Data;
using Infrastructure.DTOs;
using Services.IServices;

namespace Services.Services
{
	public class SeedingService
	{
		private readonly IScaffoldGroupService _scaffoldGroupService;
		private readonly IRoleService _roleService;
		private readonly ITagService _tagService;
		private readonly IUserService _userService;
		private readonly IDescriptorService _descriptorService;
		private readonly DataContext _context;
		private readonly ILogger<SeedingService> _logger;
		private readonly JsonSerializerOptions _jsonSerializerOptions;


		public SeedingService(
			IScaffoldGroupService scaffoldGroupService,
			IRoleService roleService,
			ITagService tagService,
			IUserService userService,
			IDescriptorService descriptorService,
			DataContext context,
			ILogger<SeedingService> logger)
		{
			_scaffoldGroupService = scaffoldGroupService;
			_roleService = roleService;
			_tagService = tagService;
			_userService = userService;
			_descriptorService = descriptorService;
			_context = context;
			_logger = logger;

			_jsonSerializerOptions = new JsonSerializerOptions
			{
				PropertyNameCaseInsensitive = true
			};
		}

		private static readonly string baseUrl = "../Data/SeedData/";

		public async Task SeedAllAsync()
		{
			try
			{
				await SeedRolesAsync();
				await SeedUsersAsync();
				await SeedDescriptorTypesAsync();
				await SeedTagsAsync();
				await SeedScaffoldGroupsAsync();
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "An error occurred while seeding the database.");
				throw;
			}
		}

		private async Task SeedRolesAsync()
		{
			if (await _context.Roles.AnyAsync() == false){
				var roleData = File.ReadAllText(baseUrl + "Roles.json");
				var roles = JsonSerializer.Deserialize<List<RoleToCreateDto>>(roleData, _jsonSerializerOptions);
				if (roles == null) {
					throw new ApplicationException("Failed to deserialize roles.");
				}
				await _roleService.CreateRoles(roles);
			}			
		}

		private async Task SeedUsersAsync()
		{
			if (await _context.Users.AnyAsync() == false){
				var userDataFile = "Users.json";
				var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
				if (env == "Production")
				{
					userDataFile = "UsersProduction.json";
				}
				var userData = File.ReadAllText(baseUrl + userDataFile);
				var usersToCreate = JsonSerializer.Deserialize<List<UserToCreateDto>>(userData, _jsonSerializerOptions);
				if (usersToCreate == null) {
					throw new ApplicationException("Failed to deserialize users");
				}
				foreach (var userToCreate in usersToCreate)
				{
					var (succeeded, errorMessage, user) = await _userService.CreateUser(userToCreate);
					if (!succeeded || user == null) {
						throw new ApplicationException("Failed to create user");

					}
					if (user.Email == "admin@lovamap.com")
					{
						await _roleService.AddToRole(user, "administrator");
					}
					else
					{
						await _roleService.AddToRole(user, "standard");
					}
				}
			}
		}

		private async Task SeedDescriptorTypesAsync()
		{
			if (await _context.DescriptorTypes.AnyAsync() == false)
			{
				var descriptorTypeData = File.ReadAllText(baseUrl + "DescriptorTypes.json");
				var descriptorTypes = JsonSerializer.Deserialize<List<DescriptorTypeToCreateDto>>(descriptorTypeData, _jsonSerializerOptions);
				if (descriptorTypes == null) {
					throw new ApplicationException("Failed to deserialize descriptors");
				}
				foreach (var descriptorType in descriptorTypes)
				{
					await _descriptorService.CreateDescriptorType(descriptorType);
				}
			}
		}

		private async Task SeedTagsAsync()
		{
			if (await _context.Tags.AnyAsync() == false)
			{
				var tagData = File.ReadAllText(baseUrl + "Tags.json");
				var tags = JsonSerializer.Deserialize<List<TagToCreateDto>>(tagData, _jsonSerializerOptions);
				if (tags == null) {
					throw new ApplicationException("Failed to deserialize tags");
				}
				await _tagService.CreateTags(tags);
			}
			
		}

		private async Task SeedScaffoldGroupsAsync()
		{
			if (await _context.ScaffoldGroups.AnyAsync() == false)
			{
				var scaffoldGroupsData = File.ReadAllText(baseUrl + "ScaffoldGroups.json");
				var scaffoldGroups = JsonSerializer.Deserialize<List<ScaffoldGroupToCreateDto>>(scaffoldGroupsData, _jsonSerializerOptions);
				if (scaffoldGroups == null) {
					throw new ApplicationException("Failed to deserialize scaffold groups");
				}
		
				await _scaffoldGroupService.CreateScaffoldGroups(scaffoldGroups, null);
			}
		}
	}
}
