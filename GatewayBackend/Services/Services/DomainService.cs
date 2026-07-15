
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.Extensions.Logging;
using Repositories.IRepositories;
using Services.IServices;
using Infrastructure.IHelpers;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

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
				// Fast path: read pre-stored metadata blob
				var domainMetadata = await _domainRepository.GetDomainMetadataById(domainId);
				if (domainMetadata != null)
					return (true, "", domainMetadata);

				// Fallback: build metadata from pore descriptors if domain is Pores category
				var domain = await _domainRepository.GetById(domainId);
				if (domain == null) return (false, "NotFound", null);

				if (domain.Category == DomainCategory.Pores)
				{
					var built = await BuildPoreMetadataFromDescriptors(domain.ScaffoldId);
					if (built != null)
					{
						// Cache-on-read: persist so subsequent calls use the fast path
						domain.Metadata = built;
						await _context.SaveChangesAsync();
						return (true, "", built);
					}
				}

				return (false, "NotFound", null);
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
					var newMetadata = ParseMetadata(domainToCreate.MetadataFile, domainToCreate.MetadataJson);
					if (newMetadata != null)
						existingDomain.Metadata = newMetadata;

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

		/// <summary>
		/// Builds pore domain metadata from stored PoreDescriptor records.
		/// Fallback for domains that don't have a pre-stored metadata blob.
		/// </summary>
		private async Task<JsonDocument?> BuildPoreMetadataFromDescriptors(int scaffoldId)
		{
			var descriptorNames = new[] { "Volume", "SA", "CharacteristicLength", "AvgInternalDiam", "LargestDoorDiam", "IsInterior" };

			var poreDescriptors = await _context.PoreDescriptors
				.Include(pd => pd.DescriptorType)
				.Where(pd => pd.ScaffoldId == scaffoldId && descriptorNames.Contains(pd.DescriptorType.Name))
				.ToListAsync();

			if (!poreDescriptors.Any()) return null;

			var descriptorMap = poreDescriptors.ToDictionary(pd => pd.DescriptorType.Name, pd => pd.Values);

			// Determine pore count from Volume descriptor (required)
			if (!descriptorMap.TryGetValue("Volume", out var volumeDoc)) return null;

			var volumes = ExtractDoubleArrayFromDescriptor(volumeDoc);
			if (volumes == null || volumes.Length == 0) return null;

			var count = volumes.Length;
			var surfAreas = descriptorMap.TryGetValue("SA", out var saDoc) ? ExtractDoubleArrayFromDescriptor(saDoc) : null;
			var charLengths = descriptorMap.TryGetValue("CharacteristicLength", out var clDoc) ? ExtractDoubleArrayFromDescriptor(clDoc) : null;
			var avgDoorDiams = descriptorMap.TryGetValue("AvgInternalDiam", out var adDoc) ? ExtractDoubleArrayFromDescriptor(adDoc) : null;
			var largestDoorDiams = descriptorMap.TryGetValue("LargestDoorDiam", out var ldDoc) ? ExtractDoubleArrayFromDescriptor(ldDoc) : null;
			var isInterior = descriptorMap.TryGetValue("IsInterior", out var iiDoc) ? ExtractIntArrayFromDescriptor(iiDoc) : null;

			var ids = new int[count];
			for (int i = 0; i < count; i++) ids[i] = i;

			var metadata = new Dictionary<string, object>();
			for (int i = 0; i < count; i++)
			{
				var poreData = new Dictionary<string, object>
				{
					["volume"] = volumes[i],
					["surfArea"] = surfAreas != null && i < surfAreas.Length ? surfAreas[i] : 0,
					["charLength"] = charLengths != null && i < charLengths.Length ? charLengths[i] : 0,
					["avgDoorDiam"] = avgDoorDiams != null && i < avgDoorDiams.Length ? avgDoorDiams[i] : 0,
					["largestDoorDiam"] = largestDoorDiams != null && i < largestDoorDiams.Length ? largestDoorDiams[i] : 0,
					["edge"] = isInterior != null && i < isInterior.Length ? (isInterior[i] != 0 ? 0 : 1) : 1,
				};
				metadata[i.ToString()] = poreData;
			}

			var result = new Dictionary<string, object>
			{
				["ids"] = ids,
				["metadata"] = metadata,
			};

			var json = JsonSerializer.Serialize(result);
			return JsonDocument.Parse(json);
		}

		/// <summary>
		/// Extracts a double[] from a PoreDescriptor Values JsonDocument.
		/// Handles both flat arrays [1.2, 3.4] and object arrays [{"value": 1.2}].
		/// </summary>
		private static double[]? ExtractDoubleArrayFromDescriptor(JsonDocument doc)
		{
			var root = doc.RootElement;
			if (root.ValueKind != JsonValueKind.Array) return null;

			var count = root.GetArrayLength();
			if (count == 0) return null;

			var result = new double[count];
			int i = 0;
			foreach (var el in root.EnumerateArray())
			{
				if (el.ValueKind == JsonValueKind.Number)
					result[i] = el.GetDouble();
				else if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty("value", out var valEl))
					result[i] = valEl.GetDouble();
				i++;
			}
			return result;
		}

		/// <summary>
		/// Extracts an int[] from a PoreDescriptor Values JsonDocument.
		/// Handles both flat arrays [0, 1] and object arrays [{"value": 0}].
		/// Also handles boolean values (true=1, false=0).
		/// </summary>
		private static int[]? ExtractIntArrayFromDescriptor(JsonDocument doc)
		{
			var root = doc.RootElement;
			if (root.ValueKind != JsonValueKind.Array) return null;

			var count = root.GetArrayLength();
			if (count == 0) return null;

			var result = new int[count];
			int i = 0;
			foreach (var el in root.EnumerateArray())
			{
				if (el.ValueKind == JsonValueKind.Number)
					result[i] = el.GetInt32();
				else if (el.ValueKind == JsonValueKind.True)
					result[i] = 1;
				else if (el.ValueKind == JsonValueKind.False)
					result[i] = 0;
				else if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty("value", out var valEl))
				{
					if (valEl.ValueKind == JsonValueKind.Number)
						result[i] = valEl.GetInt32();
					else if (valEl.ValueKind == JsonValueKind.True)
						result[i] = 1;
					else if (valEl.ValueKind == JsonValueKind.False)
						result[i] = 0;
				}
				i++;
			}
			return result;
		}

		public async Task<(bool Succeeded, string ErrorMessage, BatchReplaceResultDto? Result)> BatchReplaceMeshFiles(BatchReplaceRequestDto request)
		{
			try
			{
				if (!Directory.Exists(request.SourcePath))
				{
					return (false, $"Source directory does not exist: {request.SourcePath}", null);
				}

				var glbFiles = Directory.GetFiles(request.SourcePath, "*.glb");
				if (glbFiles.Length == 0)
				{
					return (false, "No .glb files found in source directory", null);
				}

				var result = new BatchReplaceResultDto
				{
					DryRun = request.DryRun,
					TotalFilesScanned = glbFiles.Length
				};

				// Load all domains that have a mesh file and an original filename
				var domains = await _context.Domains
					.Where(d => d.MeshFilePath != null && d.OriginalFileName != null)
					.ToListAsync();

				// Build lookup: normalized original filename -> domain (case-insensitive)
				var lookup = new Dictionary<string, Domain>(StringComparer.OrdinalIgnoreCase);
				foreach (var domain in domains)
				{
					var normalized = NormalizeFileName(domain.OriginalFileName!);
					// If multiple domains share the same normalized name, last one wins
					lookup[normalized] = domain;
				}

				foreach (var glbFilePath in glbFiles)
				{
					var fileName = Path.GetFileName(glbFilePath);
					var normalizedIncoming = NormalizeFileName(fileName);

					if (!lookup.TryGetValue(normalizedIncoming, out var domain))
					{
						result.UnmatchedFiles.Add(fileName);
						continue;
					}

					// Check for companion metadata file
					var baseName = Path.GetFileNameWithoutExtension(glbFilePath);
					var metadataFilePath = Path.Combine(request.SourcePath, $"{baseName}_metadata.json");
					var hasMetadata = File.Exists(metadataFilePath);

					var match = new BatchReplaceFileMatchDto
					{
						FileName = fileName,
						DomainId = domain.Id,
						ScaffoldId = domain.ScaffoldId,
						Category = domain.Category.ToString(),
						MatchedOriginalFileName = domain.OriginalFileName!,
						HasMetadataFile = hasMetadata,
						Replaced = false
					};

					if (request.DryRun)
					{
						result.Matched.Add(match);
						continue;
					}

					// Execute replacement
					try
					{
						var glbBytes = await File.ReadAllBytesAsync(glbFilePath);
						var newFilePath = await _domainFileService.SaveGLBFile(glbBytes, domain.ScaffoldId);
						var oldFilePath = domain.MeshFilePath;

						domain.MeshFilePath = newFilePath;
						domain.CreatedAt = DateTime.UtcNow;

						// Load metadata if companion file exists
						if (hasMetadata)
						{
							var metadataJson = await File.ReadAllTextAsync(metadataFilePath);
							domain.Metadata = JsonDocument.Parse(metadataJson);
						}

						// OriginalFileName is NOT updated — preserves matching identity for re-runs

						await _context.SaveChangesAsync();

						// Safe to delete old file after DB commit
						if (!string.IsNullOrEmpty(oldFilePath) && oldFilePath != newFilePath)
						{
							await _domainFileService.DeleteFile(oldFilePath);
						}

						match.Replaced = true;
						result.Matched.Add(match);

						_logger.LogInformation(
							"Replaced mesh for Domain {DomainId} (Scaffold {ScaffoldId}, {Category}): {FileName}",
							domain.Id, domain.ScaffoldId, domain.Category, fileName);
					}
					catch (Exception ex)
					{
						var error = $"Failed to replace {fileName} for Domain {domain.Id}: {ex.Message}";
						_logger.LogError(ex, "Failed to replace mesh for Domain {DomainId}: {FileName}", domain.Id, fileName);
						result.Errors.Add(error);
						result.Matched.Add(match);
					}
				}

				return (true, "", result);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "BatchReplaceMeshFiles failed");
				return (false, $"Unexpected error: {ex.Message}", null);
			}
		}

		public async Task<List<(string FileName, string Category)>> GetAllOriginalFileNamesAsync()
		{
			var domains = await _context.Domains
				.AsNoTracking()
				.Where(d => d.OriginalFileName != null)
				.Select(d => new { d.OriginalFileName, d.Category })
				.ToListAsync();

			return domains.Select(d => (d.OriginalFileName!, d.Category.ToString())).ToList();
		}

		/// <summary>
		/// Strips @timestamp suffix from filenames before the .glb extension.
		/// e.g. "labeledDomain_foo@20250524T124745.glb" → "labeledDomain_foo.glb"
		/// Files without @ are returned as-is.
		/// </summary>
		private static string NormalizeFileName(string fileName)
		{
			var nameWithoutExt = Path.GetFileNameWithoutExtension(fileName);
			var ext = Path.GetExtension(fileName);

			var atIndex = nameWithoutExt.LastIndexOf('@');
			if (atIndex > 0)
			{
				nameWithoutExt = nameWithoutExt.Substring(0, atIndex);
			}

			return nameWithoutExt + ext;
		}
	}

}