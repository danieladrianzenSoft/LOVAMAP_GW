
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

				// If transfer is pending, serve from staging instead of mount
				if (domain.MeshPendingTransfer)
				{
					var stagingPath = _domainFileService.GetStagingPath(filePath!);
					if (stagingPath != null)
					{
						filePath = stagingPath;
					}
				}

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

				// Save .glb file to staging
				var (_, finalPath) = await _domainFileService.SaveGLBToStaging(glbBytes, domainToCreate.ScaffoldId);
				var originalFileName = domainToCreate.MeshFile.FileName;

				string? oldFilePath = null;

				// Update or create domain
				if (existingDomain != null)
				{
					// Store the old file path for later deletion
					oldFilePath = existingDomain.MeshFilePath;

					// Update existing domain
					existingDomain.MeshFilePath = finalPath;
					existingDomain.MeshPendingTransfer = true;
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
						MeshFilePath = finalPath,
						MeshPendingTransfer = true,
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
				if (!string.IsNullOrEmpty(oldFilePath) && oldFilePath != finalPath)
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
						var (_, finalPath) = await _domainFileService.SaveGLBToStaging(glbBytes, domain.ScaffoldId);
						var oldFilePath = domain.MeshFilePath;

						domain.MeshFilePath = finalPath;
						domain.MeshPendingTransfer = true;
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
						if (!string.IsNullOrEmpty(oldFilePath) && oldFilePath != finalPath)
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

		public async Task<Infrastructure.Helpers.PagedList<DomainListItemDto>> GetDomainList(DomainFilterParams filterParams)
		{
			return await _domainRepository.GetFilteredList(filterParams);
		}

		public async Task<DomainSummaryDto> GetDomainSummary()
		{
			return await _domainRepository.GetSummary();
		}

		public async Task<(bool Succeeded, string ErrorMessage, BatchMetadataUpdateResultDto? Result)> BatchUpdateMetadata(BatchMetadataUpdateRequestDto request)
		{
			try
			{
				if (!Directory.Exists(request.SourcePath))
				{
					return (false, $"Source directory does not exist: {request.SourcePath}", null);
				}

				var metadataFiles = Directory.GetFiles(request.SourcePath, "*_metadata.json");
				if (metadataFiles.Length == 0)
				{
					return (false, "No *_metadata.json files found in source directory", null);
				}

				var result = new BatchMetadataUpdateResultDto
				{
					DryRun = request.DryRun,
					TotalFilesScanned = metadataFiles.Length
				};

				// Build domain lookup (same pattern as BatchReplaceMeshFiles)
				var domains = await _context.Domains
					.Where(d => d.OriginalFileName != null)
					.ToListAsync();

				var lookup = new Dictionary<string, Domain>(StringComparer.OrdinalIgnoreCase);
				foreach (var domain in domains)
				{
					var normalized = NormalizeFileName(domain.OriginalFileName!);
					lookup[normalized] = domain;
				}

				foreach (var metadataFilePath in metadataFiles)
				{
					var metadataFileName = Path.GetFileName(metadataFilePath);
					// Strip _metadata.json to get the base stem, then append .glb for lookup
					var baseStem = metadataFileName.Replace("_metadata.json", "");
					var glbFileName = baseStem + ".glb";
					var normalizedIncoming = NormalizeFileName(glbFileName);

					if (!lookup.TryGetValue(normalizedIncoming, out var domain))
					{
						result.UnmatchedFiles.Add(metadataFileName);
						continue;
					}

					// Check for companion .glb file
					var companionGlbPath = Path.Combine(request.SourcePath, baseStem + ".glb");
					var hasCompanionMesh = File.Exists(companionGlbPath);

					var match = new BatchMetadataMatchDto
					{
						FileName = metadataFileName,
						DomainId = domain.Id,
						ScaffoldId = domain.ScaffoldId,
						Category = domain.Category.ToString(),
						MatchedOriginalFileName = domain.OriginalFileName!,
						HasCompanionMesh = hasCompanionMesh,
						Updated = false
					};

					if (request.DryRun)
					{
						result.Matched.Add(match);
						continue;
					}

					// Execute metadata update
					try
					{
						var metadataJson = await File.ReadAllTextAsync(metadataFilePath);
						domain.Metadata = JsonDocument.Parse(metadataJson);

						// Optionally replace mesh too
						if (request.IncludeMeshes && hasCompanionMesh)
						{
							var glbBytes = await File.ReadAllBytesAsync(companionGlbPath);
							var (_, finalPath) = await _domainFileService.SaveGLBToStaging(glbBytes, domain.ScaffoldId);
							var oldFilePath = domain.MeshFilePath;

							domain.MeshFilePath = finalPath;
							domain.MeshPendingTransfer = true;
							domain.CreatedAt = DateTime.UtcNow;

							await _context.SaveChangesAsync();

							if (!string.IsNullOrEmpty(oldFilePath) && oldFilePath != finalPath)
							{
								await _domainFileService.DeleteFile(oldFilePath);
							}
						}
						else
						{
							await _context.SaveChangesAsync();
						}

						match.Updated = true;
						result.Matched.Add(match);

						_logger.LogInformation(
							"Updated metadata for Domain {DomainId} (Scaffold {ScaffoldId}, {Category}): {FileName}",
							domain.Id, domain.ScaffoldId, domain.Category, metadataFileName);
					}
					catch (Exception ex)
					{
						var error = $"Failed to update {metadataFileName} for Domain {domain.Id}: {ex.Message}";
						_logger.LogError(ex, "Failed to update metadata for Domain {DomainId}: {FileName}", domain.Id, metadataFileName);
						result.Errors.Add(error);
						result.Matched.Add(match);
					}
				}

				return (true, "", result);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "BatchUpdateMetadata failed");
				return (false, $"Unexpected error: {ex.Message}", null);
			}
		}

		public async Task<List<DomainLookupItemDto>> GetDomainLookupList()
		{
			return await _context.Domains
				.AsNoTracking()
				.Where(d => d.OriginalFileName != null)
				.Select(d => new DomainLookupItemDto
				{
					Id = d.Id,
					ScaffoldId = d.ScaffoldId,
					Category = d.Category.ToString(),
					OriginalFileName = d.OriginalFileName!,
					HasMetadata = d.Metadata != null
				})
				.ToListAsync();
		}

		public async Task<(bool Succeeded, string ErrorMessage, BatchMetadataUpdateResultDto? Result)> BatchUpdateMetadataFromUpload(
			IList<IFormFile> metadataFiles, IList<IFormFile>? meshFiles, List<MetadataUploadMappingDto> mappings, bool includeMeshes)
		{
			try
			{
				var result = new BatchMetadataUpdateResultDto
				{
					DryRun = false,
					TotalFilesScanned = metadataFiles.Count
				};

				// Index uploaded files by filename for quick lookup
				var metadataByName = metadataFiles.ToDictionary(f => f.FileName, f => f, StringComparer.OrdinalIgnoreCase);
				var meshByName = meshFiles?.ToDictionary(f => f.FileName, f => f, StringComparer.OrdinalIgnoreCase)
					?? new Dictionary<string, IFormFile>(StringComparer.OrdinalIgnoreCase);

				foreach (var mapping in mappings)
				{
					if (!metadataByName.TryGetValue(mapping.FileName, out var metadataFile))
					{
						result.Errors.Add($"Metadata file not found in upload: {mapping.FileName}");
						continue;
					}

					var domain = await _domainRepository.GetById(mapping.DomainId);
					if (domain == null)
					{
						result.Errors.Add($"Domain {mapping.DomainId} not found for file {mapping.FileName}");
						continue;
					}

					// Derive companion mesh filename: strip _metadata.json → add .glb
					var baseStem = mapping.FileName.Replace("_metadata.json", "");
					var companionMeshName = baseStem + ".glb";
					var hasCompanionMesh = meshByName.ContainsKey(companionMeshName);

					var match = new BatchMetadataMatchDto
					{
						FileName = mapping.FileName,
						DomainId = domain.Id,
						ScaffoldId = domain.ScaffoldId,
						Category = domain.Category.ToString(),
						MatchedOriginalFileName = domain.OriginalFileName ?? "",
						HasCompanionMesh = hasCompanionMesh,
						Updated = false
					};

					try
					{
						// Parse and set metadata
						using var reader = new StreamReader(metadataFile.OpenReadStream());
						var json = await reader.ReadToEndAsync();
						domain.Metadata = JsonDocument.Parse(json);

						// Optionally replace mesh
						if (includeMeshes && hasCompanionMesh && meshByName.TryGetValue(companionMeshName, out var meshFile))
						{
							_logger.LogInformation(
								"Upload: saving mesh {MeshName} for Domain {DomainId} (IFormFile.Length={Length})",
								companionMeshName, domain.Id, meshFile.Length);

							using var sourceStream = meshFile.OpenReadStream();
							using var ms = new MemoryStream();
							await sourceStream.CopyToAsync(ms);
							var glbBytes = ms.ToArray();

							_logger.LogInformation(
								"Upload: mesh bytes read for Domain {DomainId}: {ByteCount} bytes, first4=[{B0:X2} {B1:X2} {B2:X2} {B3:X2}]",
								domain.Id, glbBytes.Length,
								glbBytes.Length > 0 ? glbBytes[0] : 0,
								glbBytes.Length > 1 ? glbBytes[1] : 0,
								glbBytes.Length > 2 ? glbBytes[2] : 0,
								glbBytes.Length > 3 ? glbBytes[3] : 0);

							var (_, finalPath) = await _domainFileService.SaveGLBToStaging(glbBytes, domain.ScaffoldId);
							var oldFilePath = domain.MeshFilePath;

							domain.MeshFilePath = finalPath;
							domain.MeshPendingTransfer = true;
							domain.CreatedAt = DateTime.UtcNow;

							await _context.SaveChangesAsync();

							if (!string.IsNullOrEmpty(oldFilePath) && oldFilePath != finalPath)
							{
								await _domainFileService.DeleteFile(oldFilePath);
							}
						}
						else
						{
							await _context.SaveChangesAsync();
						}

						match.Updated = true;
						result.Matched.Add(match);

						_logger.LogInformation(
							"Upload: updated metadata for Domain {DomainId} (Scaffold {ScaffoldId}, {Category}): {FileName}",
							domain.Id, domain.ScaffoldId, domain.Category, mapping.FileName);
					}
					catch (Exception ex)
					{
						var error = $"Failed to update {mapping.FileName} for Domain {domain.Id}: {ex.Message}";
						_logger.LogError(ex, "Upload: failed to update metadata for Domain {DomainId}: {FileName}", domain.Id, mapping.FileName);
						result.Errors.Add(error);
						result.Matched.Add(match);
					}
				}

				return (true, "", result);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "BatchUpdateMetadataFromUpload failed");
				return (false, $"Unexpected error: {ex.Message}", null);
			}
		}

		private static readonly byte[] GlbMagic = { 0x67, 0x6C, 0x54, 0x46 };

		public async Task<List<int>> GetDomainsWithInvalidMeshes()
		{
			var invalidIds = new List<int>();
			var domains = await _context.Domains
				.Where(d => d.MeshFilePath != null && d.MeshFilePath != "")
				.Select(d => new { d.Id, d.MeshFilePath })
				.ToListAsync();

			foreach (var d in domains)
			{
				try
				{
					if (!File.Exists(d.MeshFilePath!))
					{
						invalidIds.Add(d.Id);
						continue;
					}

					var header = new byte[4];
					await using var fs = new FileStream(d.MeshFilePath!, FileMode.Open, FileAccess.Read, FileShare.Read);
					var bytesRead = await fs.ReadAsync(header);
					if (bytesRead < 4 || !header.AsSpan().SequenceEqual(GlbMagic))
					{
						invalidIds.Add(d.Id);
					}
				}
				catch
				{
					invalidIds.Add(d.Id);
				}
			}

			return invalidIds;
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