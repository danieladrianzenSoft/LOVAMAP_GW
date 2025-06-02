
using System;
using System.Linq;
using System.Numerics;
using System.Text.Json;
using System.Threading.Tasks;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.Extensions.Logging;
using Repositories.IRepositories;
using Services.IServices;
using Infrastructure.IHelpers;
using SharpGLTF.Schema2;
using SharpGLTF.Geometry;
using SharpGLTF.Geometry.VertexTypes;
using SharpGLTF.Materials;
using SharpGLTF.Scenes;
using MIConvexHull;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http;

namespace Services.Services
{	
	public class DomainService : IDomainService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IDomainRepository _domainRepository;
		private readonly IDomainFileService _domainFileService;
		private readonly IUserAuthHelper _userAuthHelper;
		private readonly IScaffoldGroupRepository _scaffoldGroupRepository;
		private readonly ILogger<DomainService> _logger;

		public DomainService(DataContext context, IModelMapper modelMapper, 
			IDomainRepository domainRepository, IDomainFileService domainFileService, 
			IScaffoldGroupRepository scaffoldGroupRepository,
			IUserAuthHelper userAuthHelper, ILogger<DomainService> logger)
		{
			_context = context;
			_modelMapper = modelMapper;
			_domainRepository = domainRepository;
			_scaffoldGroupRepository = scaffoldGroupRepository;
			_domainFileService = domainFileService;
			_userAuthHelper = userAuthHelper;
			_logger = logger;
		}

		public async Task<(bool Succeeded, string ErrorMessage, Byte[]? Mesh, DomainToVisualizeDto? Domain)> GetDomain(int scaffoldId, DomainCategory category)
		{
			try
			{
				var domain = await _domainRepository.GetByScaffoldIdAndCategory(scaffoldId, category);

				if (domain == null || String.IsNullOrEmpty(domain.MeshFilePath))
				{
					return (false, "Domain not found", null, null);
				}

				var filePath = domain.MeshFilePath;
				if (!File.Exists(filePath))
				{
					return (false, "Mesh file not found", null, null);
				}

				var fileBytes = await File.ReadAllBytesAsync(filePath);

				var domainMetadata = new DomainToVisualizeDto
				{
					Id = domain.Id,
					ScaffoldId = domain.ScaffoldId,
					Category = (int)domain.Category,
					VoxelCount = domain.VoxelCount,
					VoxelSize = domain.VoxelSize,
					DomainSize = domain.DomainSize,
					OriginalFileName = domain.OriginalFileName,
					MeshFilePath = Path.GetFileName(filePath) // Path, not actual file content
				};

				return (true, "", fileBytes, domainMetadata);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get the domain");
				return (false, "UnexpectedError", null, null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage, JsonDocument? DomainMetadata)> GetDomainMetadata(int domainId)
		{
			try
			{
				var domainMetadata = await _domainRepository.GetDomainMetadataById(domainId);

				if (domainMetadata == null) return (false, "NotFound", null);

				return (true, "", domainMetadata);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get domain metadata");
				return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage)> UpdateDomainMetadata(DomainMetadataToUpdateDto dto)
		{
			try
			{
				var domain = await _domainRepository.GetById(dto.DomainId);
				if (domain == null) return (false, "Domain not found");

				var newMetadata = ParseMetadata(dto.MetadataFile, dto.MetadataJson);
				if (newMetadata == null) return (false, "Invalid or missing metadata");

				domain.Metadata = newMetadata;
				await _context.SaveChangesAsync();
				
				return (true, "");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to update domain metadata");
				return (false, "UnexpectedError");
			}
		}
	
		public async Task<(bool Succeeded, string ErrorMessage, DomainToVisualizeDto? Domain)> CreateDomain(DomainToCreateDto domainToCreate)
		{
			try
			{
				if (domainToCreate.MeshFile == null || domainToCreate.MeshFile.Length == 0)
				{
					return (false, "No file uploaded", null);
				}

				var fileExtension = Path.GetExtension(domainToCreate.MeshFile.FileName).ToLower();

				if (fileExtension == ".glb")
				{
					return await ProcessGLBFile(domainToCreate);
				}
				else if (fileExtension == ".json")
				{
					_logger.LogInformation("Received a JSON file. Future processing will be handled.");
					return (false, "JSON processing not implemented yet", null);
				}
				else
				{
					return (false, "Invalid file format. Only .glb and .json are supported.", null);
				}

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to create the domain");
				return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage)> DeleteDomain(int domainId, string userId)
		{
			try
			{
				var domain = await _domainRepository.GetById(domainId);
				if (domain == null)
					return (false, "Domain not found.");

				var scaffoldGroup = await _scaffoldGroupRepository.GetSummaryByScaffoldId(domain.ScaffoldId);
				if (scaffoldGroup == null)
					return (false, "ScaffoldGroup not found.");

				var isAdmin = await _userAuthHelper.IsInRole(userId, "administrator");

				if (scaffoldGroup.UploaderId != userId && !isAdmin)
					return (false, "Unauthorized to delete this domain.");

				// Attempt to delete the mesh file
				if (!string.IsNullOrWhiteSpace(domain.MeshFilePath))
				{
					var fileDeleted = await _domainFileService.DeleteFile(domain.MeshFilePath!);
					if (!fileDeleted)
						_logger.LogWarning("Mesh file not found or couldn't be deleted: {FilePath}", domain.MeshFilePath);
				}

				_domainRepository.Delete(domain);
				await _context.SaveChangesAsync();

				return (true, "");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to delete domain {DomainId}", domainId);
				return (false, "Unexpected error occurred while deleting domain.");
			}
		}

		public async Task<int?> GetRandomScaffoldIdForDomainAsync()
		{
			return await _domainRepository.GetRandomDomainIdWithMeshAsync();
		}
		
		private JsonDocument? ParseMetadata(IFormFile? metadataFile, string? metadataJson)
		{
			try
			{
				if (metadataFile != null && metadataFile.Length > 0)
				{
					using var reader = new StreamReader(metadataFile.OpenReadStream());
					var json = reader.ReadToEnd();
					return JsonDocument.Parse(json);
				}
				else if (!string.IsNullOrWhiteSpace(metadataJson))
				{
					return JsonDocument.Parse(metadataJson);
				}
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Failed to parse metadata JSON");
			}
			return null;
		}

		private async Task<(bool Succeeded, string ErrorMessage, DomainToVisualizeDto? Domain)> ProcessGLBFile(DomainToCreateDto domainToCreate)
		{
			try
			{
				// Validate domain category
				if (!Enum.IsDefined(typeof(DomainCategory), domainToCreate.Category))
				{
					return (false, $"Invalid domain category: {domainToCreate.Category}", null);
				}

				// Check if a domain already exists
				var existingDomain = await _domainRepository.GetByScaffoldIdAndCategory(domainToCreate.ScaffoldId, (DomainCategory)domainToCreate.Category);

				// Read file as byte array
				using var memoryStream = new MemoryStream();
				await domainToCreate.MeshFile.CopyToAsync(memoryStream);
				var glbBytes = memoryStream.ToArray();

				// Save .glb file using DomainFileService
				var newFilePath = await _domainFileService.SaveGLBFile(glbBytes, domainToCreate.ScaffoldId);
				var originalFileName = domainToCreate.MeshFile.FileName;

				string? oldFilePath = null;

				// Update or create domain
				if (existingDomain != null)
				{
					// Store the old file path for later deletion
					oldFilePath = existingDomain.MeshFilePath;

					// Update existing domain
					existingDomain.MeshFilePath = newFilePath;
					existingDomain.VoxelCount = domainToCreate.VoxelCount ?? 0;
					existingDomain.VoxelSize = domainToCreate.VoxelSize ?? 0;
					existingDomain.DomainSize = domainToCreate.DomainSize ?? "N/A";
					existingDomain.CreatedAt = DateTime.UtcNow;
					existingDomain.OriginalFileName = originalFileName;
					existingDomain.Metadata = ParseMetadata(domainToCreate.MetadataFile, domainToCreate.MetadataJson);

					_domainRepository.Update(existingDomain);
				}
				else
				{
					var newDomain = new Domain
					{
						ScaffoldId = domainToCreate.ScaffoldId,
						Category = (DomainCategory)domainToCreate.Category,
						MeshFilePath = newFilePath,
						VoxelCount = domainToCreate.VoxelCount ?? 0,
						VoxelSize = domainToCreate.VoxelSize ?? 0,
						DomainSize = domainToCreate.DomainSize ?? "N/A",
						CreatedAt = DateTime.UtcNow,
						OriginalFileName = originalFileName,
						Metadata = ParseMetadata(domainToCreate.MetadataFile, domainToCreate.MetadataJson)
					};
					_domainRepository.Add(newDomain);
					existingDomain = newDomain;
				}

				await _context.SaveChangesAsync();

				// Now it's safe to delete the old file
				if (!string.IsNullOrEmpty(oldFilePath) && oldFilePath != newFilePath)
				{
					await _domainFileService.DeleteFile(oldFilePath);
				}

				var domainToVisualize = new DomainToVisualizeDto
				{
					Id = existingDomain.Id,
					ScaffoldId = existingDomain.ScaffoldId,
					Category = (int)existingDomain.Category,
					VoxelCount = existingDomain.VoxelCount,
					VoxelSize = existingDomain.VoxelSize,
					DomainSize = existingDomain.DomainSize,
					MeshFilePath = existingDomain.MeshFilePath,
					OriginalFileName = existingDomain.OriginalFileName,
				};

				return (true, "", domainToVisualize);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to process .glb file");
				return (false, "Error processing .glb file", null);
			}
		}		

	}

}