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
	public class SeedingService: ISeedingService
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
		private readonly IEnumerable<IDescriptorValueGenerator> _generators;

		public SeedingService(
			IScaffoldGroupService scaffoldGroupService,
			IRoleService roleService,
			ITagService tagService,
			IUserService userService,
			IDescriptorService descriptorService,
			IPublicationService publicationService,
			IEnumerable<IDescriptorValueGenerator>generators,
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
			_generators = generators;
			_context = context;
			_logger = logger;

			_jsonSerializerOptions = new JsonSerializerOptions
			{
				PropertyNameCaseInsensitive = true
			};
		}

		private static readonly string baseUrl = "../Data/SeedData/";
		// private static readonly string baseUrl = Path.Combine(Directory.GetCurrentDirectory(), "Data", "SeedData");

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

		public async Task<List<int>> GetEligibleScaffoldIdsForDescriptorSeeding(string descriptorName)
		{
			var descriptorType = await _context.DescriptorTypes
				.AsNoTracking()
				.FirstOrDefaultAsync(dt => dt.Name == descriptorName);

			if (descriptorType == null)
				throw new Exception($"DescriptorType '{descriptorName}' not found.");

			IQueryable<int> alreadySeededScaffoldIds;

			switch (descriptorType.Category.ToLower())
			{
				case "global":
					alreadySeededScaffoldIds = _context.GlobalDescriptors
						.AsNoTracking()
						.Where(gd => gd.DescriptorTypeId == descriptorType.Id)
						.Select(gd => gd.ScaffoldId);
					break;

				case "pore":
					alreadySeededScaffoldIds = _context.PoreDescriptors
						.AsNoTracking()
						.Where(pd => pd.DescriptorTypeId == descriptorType.Id)
						.Select(pd => pd.ScaffoldId);
					break;

				case "other":
					alreadySeededScaffoldIds = _context.OtherDescriptors
						.AsNoTracking()
						.Where(od => od.DescriptorTypeId == descriptorType.Id)
						.Select(od => od.ScaffoldId);
					break;

				default:
					throw new Exception($"Unknown descriptor category: {descriptorType.Category}");
			}

			var allScaffoldIds = _context.Scaffolds
				.AsNoTracking()
				.Select(s => s.Id);

			// Use Except to get scaffolds missing the descriptor
			var eligibleIds = await allScaffoldIds
				.Except(alreadySeededScaffoldIds)
				.ToListAsync();

			return eligibleIds;
		}

		public async Task<DescriptorSeedResultDto> SeedDescriptorAsync(string descriptorName, List<int> scaffoldIds)
		{
			var result = new DescriptorSeedResultDto();

			var generator = _generators.FirstOrDefault(g => g.DescriptorName == descriptorName);
			if (generator == null)
				throw new Exception($"No generator registered for '{descriptorName}'");

			var descriptorType = await _context.DescriptorTypes
				.FirstOrDefaultAsync(dt => dt.Name == descriptorName);

			if (descriptorType == null)
				throw new Exception($"DescriptorType '{descriptorName}' not found.");

			var seedDataObjects = generator.PreloadSeedData(scaffoldIds, _context);

			var globalDescriptors = new List<GlobalDescriptor>();
			var poreDescriptors = new List<PoreDescriptor>();
			var otherDescriptors = new List<OtherDescriptor>();

			foreach (var seedData in seedDataObjects)
			{
				var scaffoldId = (int)seedData.GetType().GetProperty("ScaffoldId")?.GetValue(seedData)!;

				result.Attempted++;

				try
				{
					var descriptor = generator.GenerateDescriptor(seedData, descriptorType);
					if (descriptor == null)
					{
						result.FailedScaffoldIds.Add(scaffoldId);
						continue;
					}

					switch (generator.Category.ToLowerInvariant())
					{
						case "global":
							globalDescriptors.Add((GlobalDescriptor)descriptor);
							break;
						case "pore":
							poreDescriptors.Add((PoreDescriptor)descriptor);
							break;
						case "other":
							otherDescriptors.Add((OtherDescriptor)descriptor);
							break;
					}

					result.Succeeded++;
				}
				catch (Exception ex)
				{
					_logger.LogWarning(ex, $"Failed to seed descriptor '{descriptorName}' for scaffold {scaffoldId}");
					result.FailedScaffoldIds.Add(scaffoldId);
				}
			}

			// Add everything in bulk
			_context.GlobalDescriptors.AddRange(globalDescriptors);
			_context.PoreDescriptors.AddRange(poreDescriptors);
			_context.OtherDescriptors.AddRange(otherDescriptors);
			await _context.SaveChangesAsync();
			return result;
		}

		private async Task SeedTagsAsync()
		{
			if (await _context.Tags.AnyAsync() == false)
			{
				var path = Path.Combine(baseUrl, "Tags.json");
				var tagData = File.ReadAllText(path);
				var tags = JsonSerializer.Deserialize<List<TagToSeedDto>>(tagData, _jsonSerializerOptions);
				if (tags == null)
				{
					throw new ApplicationException("Failed to deserialize tags");
				}
				await _tagService.SeedTags(tags);
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
