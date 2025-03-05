
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
		private readonly ILogger<DomainService> _logger;

		public DomainService(DataContext context, IModelMapper modelMapper, 
			IDomainRepository domainRepository, IDomainFileService domainFileService, 
			ILogger<DomainService> logger)
		{
			_context = context;
			_modelMapper = modelMapper;
			_domainRepository = domainRepository;
			_domainFileService = domainFileService;
			_logger = logger;
		}

		public async Task<(bool Succeeded, string ErrorMessage, Byte[]? Mesh, DomainToVisualizeDto? Domain)> GetDomain(int scaffoldId)
		{
			try
			{
				var domain = await _domainRepository.GetByScaffoldIdAndCategory(scaffoldId, DomainCategory.Particle);

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
						CreatedAt = DateTime.UtcNow
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
					MeshFilePath = existingDomain.MeshFilePath
				};

				return (true, "", domainToVisualize);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to process .glb file");
				return (false, "Error processing .glb file", null);
			}
		}

		private Dictionary<string, List<int>> ExpandVoxelIndices(DomainFromJsonDto domainData)
		{
			var expandedVoxels = new Dictionary<string, List<int>>();

			foreach (var (particleId, ranges) in domainData.bead_data)
			{
				var voxelList = new List<int>();
				foreach (var range in ranges)
				{
					int start = range[0], end = range[1];
					for (int i = start; i <= end; i++)
					{
						voxelList.Add(i);
					}
				}
				expandedVoxels[particleId] = voxelList;
			}

			return expandedVoxels;
		}

		private Dictionary<string, List<Vector3>> ConvertTo3DCoordinates(DomainFromJsonDto domainData, double[] domainBounds)
		{
			var expandedVoxels = ExpandVoxelIndices(domainData); // Expand voxel ranges

			var particleMeshes = new Dictionary<string, List<Vector3>>();
			foreach (var (particleId, voxelIndices) in expandedVoxels)
			{
				var voxelPositions = ConvertTo3D(voxelIndices, domainData.voxel_size, domainBounds, domainData.domain_size.ToArray());
				particleMeshes[particleId] = voxelPositions;
			}

			return particleMeshes;
		}

		private List<Vector3> ConvertTo3D(List<int> voxelIndices, double voxelSize, double[] domainBounds, int[] domainSize)
		{
			var voxelPositions = new List<Vector3>();

			// Domain bounds (xMin, xMax, yMin, yMax, zMin, zMax)
			double xMin = domainBounds[0], xMax = domainBounds[1];
			double yMin = domainBounds[2], yMax = domainBounds[3];
			double zMin = domainBounds[4], zMax = domainBounds[5];

			// Grid sizes (nx, ny, nz)
			int nx = domainSize[0];
			int ny = domainSize[1];
			int nz = domainSize[2];

			// Generate voxel centers (equivalent to Python np.linspace logic)
			double[] zCenters = Enumerable.Range(0, nz)
				.Select(i => zMin + (i + 0.5) * voxelSize)
				.ToArray();
			
			double[] yCenters = Enumerable.Range(0, ny)
				.Select(i => yMin + (i + 0.5) * voxelSize)
				.ToArray();

			double[] xCenters = Enumerable.Range(0, nx)
				.Select(i => xMin + (i + 0.5) * voxelSize)
				.ToArray();

			// Compute 1D-to-3D mapping (z-first ordering)
			foreach (int index in voxelIndices)
			{
				int z = index / (nx * ny);
				int y = (index % (nx * ny)) / nx;
				int x = index % nx;

				if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz)
				{
					_logger.LogWarning($"Invalid voxel index ({x}, {y}, {z}) found.");
					continue;  // Skip this index to prevent crashing
				}

				double xPos = xCenters[x];
				double yPos = yCenters[y];
				double zPos = zCenters[z];

				voxelPositions.Add(new Vector3((float)xPos, (float)yPos, (float)zPos));
			}

			return voxelPositions;
		}

		

	}

}