using System.Text.Json;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Data;
using Infrastructure.DTOs;
using Services.IServices;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using Data.Models;
using System.Globalization;

namespace Services.Services
{
	public class SeedingService
	{
		private readonly IScaffoldGroupService _scaffoldGroupService;
		private readonly IRoleService _roleService;
		private readonly ITagService _tagService;
		private readonly IUserService _userService;
		private readonly IConfiguration _configuration;
		private readonly IDescriptorService _descriptorService;
		private readonly IPublicationService _publicationService;
		private readonly DataContext _context;
		private readonly ILogger<SeedingService> _logger;
		private readonly JsonSerializerOptions _jsonSerializerOptions;


		public SeedingService(
			IScaffoldGroupService scaffoldGroupService,
			IRoleService roleService,
			ITagService tagService,
			IUserService userService,
			IDescriptorService descriptorService,
			IPublicationService publicationService,
			IConfiguration configuration,
			DataContext context,
			ILogger<SeedingService> logger)
		{
			_scaffoldGroupService = scaffoldGroupService;
			_roleService = roleService;
			_tagService = tagService;
			_userService = userService;
			_descriptorService = descriptorService;
			_publicationService = publicationService;
			_configuration = configuration;
			_context = context;
			_logger = logger;

			_jsonSerializerOptions = new JsonSerializerOptions
			{
				PropertyNameCaseInsensitive = true
			};
		}

		// private static readonly string baseUrl = "../Data/SeedData/";
		private static readonly string baseUrl = Path.Combine(Directory.GetCurrentDirectory(), "Data", "SeedData");

		public async Task SeedAllAsync()
		{
			try
			{
				await SeedRolesAsync();
				await SeedUsersAsync();
				await SeedPublicationsAsync();
				await SeedDescriptorTypesAsync();
				await SeedTagsAsync();
				// await SeedScaffoldGroupsAsync();
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "An error occurred while seeding the database.");
			}
		}

		private async Task SeedRolesAsync()
		{
			if (await _context.Roles.AnyAsync() == false){
				var path = Path.Combine(baseUrl, "Roles.json");
				var roleData = File.ReadAllText(path);
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
				var path = Path.Combine(baseUrl, "Users.json");
				var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            	var adminPassword = _configuration["AdminPassword"]; // Fetch AdminPassword from appsettings.json

				// if (env == "Production")
				// {
				// 	userDataFile = "UsersProduction.json";
				// }
				if (string.IsNullOrEmpty(adminPassword))
				{
					throw new ApplicationException("AdminPassword environment variable is not set.");
				}

				var userData = File.ReadAllText(path);
				var usersToCreate = JsonSerializer.Deserialize<List<UserToCreateDto>>(userData, _jsonSerializerOptions);
				if (usersToCreate == null) {
					throw new ApplicationException("Failed to deserialize users");
				}
				foreach (var userToCreate in usersToCreate)
				{
					if (userToCreate.Email == "admin@lovamap.com")
					{
						userToCreate.Password = adminPassword;
					}
					var (succeeded, errorMessage, user) = await _userService.CreateUser(userToCreate);
					if (!succeeded || user == null) {
						throw new ApplicationException($"Failed to create user: {errorMessage}");

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

		private async Task SeedPublicationsAsync()
		{
			if (await _context.Publications.AnyAsync() == false)
			{
				var path = Path.Combine(baseUrl, "Publications.json");
				var publicationData = File.ReadAllText(path);
				var publications = JsonSerializer.Deserialize<List<PublicationToCreateDto>>(publicationData, _jsonSerializerOptions);
				if (publications == null) {
					throw new ApplicationException("Failed to deserialize descriptors");
				}
				foreach (var publication in publications)
				{
					publication.PublishedAt = DateTime.SpecifyKind(publication.PublishedAt, DateTimeKind.Utc);
					await _publicationService.CreatePublication(publication);
				}
			}
		}

		private async Task SeedDescriptorTypesAsync()
		{
			if (await _context.DescriptorTypes.AnyAsync() == false)
			{
				var path = Path.Combine(baseUrl, "DescriptorTypes.json");
				var descriptorTypeData = File.ReadAllText(path);
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
				var path = Path.Combine(baseUrl, "Tags.json");
				var tagData = File.ReadAllText(path);
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
				var path = Path.Combine(baseUrl, "ScaffoldGroups.json");
				var scaffoldGroupsData = File.ReadAllText(path);
				var scaffoldGroups = JsonSerializer.Deserialize<List<ScaffoldGroupToCreateDto>>(scaffoldGroupsData, _jsonSerializerOptions);
				if (scaffoldGroups == null) {
					throw new ApplicationException("Failed to deserialize scaffold groups");
				}
		
				await _scaffoldGroupService.CreateScaffoldGroups(scaffoldGroups, null);
			}
		}
	}
}
