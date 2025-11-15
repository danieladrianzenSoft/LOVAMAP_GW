using Repositories.IRepositories;
using Data.Models;
using Infrastructure.DTOs;
using Services.IServices;
using Infrastructure.Helpers;
using Infrastructure.IHelpers;
using System.Text.Json;
using Data;
using Microsoft.Extensions.Logging;
using Repositories.Repositories;

namespace Services.Services
{
	public class PublicationDatasetService : IPublicationDatasetService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IPublicationDatasetRepository _publicationDatasetRepository;
		private readonly IScaffoldGroupRepository _scaffoldGroupRepository;
		private readonly IDescriptorRepository _descriptorRepository;
		private readonly IPublicationRepository _publicationRepository;

		private readonly ILogger<PublicationDatasetService> _logger;
		public PublicationDatasetService(DataContext context, IModelMapper modelMapper,
			IPublicationDatasetRepository publicationDatasetRepository, IDescriptorRepository descriptorRepository,
			IScaffoldGroupRepository scaffoldGroupRepository, IPublicationRepository publicationRepository,
			ILogger<PublicationDatasetService> logger)
		{
			_context = context;
			_modelMapper = modelMapper;
			_publicationDatasetRepository = publicationDatasetRepository;
			_scaffoldGroupRepository = scaffoldGroupRepository;
			_descriptorRepository = descriptorRepository;
			_publicationRepository = publicationRepository;
			_logger = logger;
		}
		public async Task<(bool Succeeded, string ErrorMessage, PublicationDatasetDto? publicationDatasetDto)> CreatePublicationDatasetAsync(PublicationDatasetForCreationDto datasetForCreationDto)
		{
			try
			{
				if (string.IsNullOrWhiteSpace(datasetForCreationDto.Name))
					return (false, "Dataset name is required.", null);

				// 1) Validate Publication exists
				if (!await _publicationRepository.ExistsAsync(datasetForCreationDto.PublicationId))
					return (false, $"Publication {datasetForCreationDto.PublicationId} not found.", null);

				// 2) Enforce name uniqueness within publication
				if (await _publicationDatasetRepository.PublicationDatasetNameExistsAsync(datasetForCreationDto.PublicationId, datasetForCreationDto.Name.Trim()))
					return (false, $"A dataset named '{datasetForCreationDto.Name}' already exists for this publication.", null);

				// 3) Validate scaffolds
				var requestedScaffoldIds = datasetForCreationDto.ScaffoldIds?.Distinct().ToArray() ?? Array.Empty<int>();
				var existingScaffoldIds = await _scaffoldGroupRepository.GetExistingScaffoldIdsAsync(requestedScaffoldIds);
				var missingScaffolds = requestedScaffoldIds.Except(existingScaffoldIds).ToArray();
				if (missingScaffolds.Length > 0)
					return (false, $"Some scaffolds do not exist: {string.Join(",", missingScaffolds)}", null);

				// 4) Validate descriptor types + Job rule soundness
				var requestedDescriptorTypeIds = datasetForCreationDto.DescriptorRules?.Select(r => r.DescriptorTypeId).Distinct().ToArray() ?? Array.Empty<int>();
				var existingDescriptorTypeIds = await _descriptorRepository.GetExistingIdsAsync(requestedDescriptorTypeIds);
				var missingDescriptorTypes = requestedDescriptorTypeIds.Except(existingDescriptorTypeIds).ToArray();
				if (missingDescriptorTypes.Length > 0)
					return (false, $"Some DescriptorTypes do not exist: {string.Join(",", missingDescriptorTypes)}", null);

				foreach (var r in datasetForCreationDto.DescriptorRules ?? Array.Empty<PublicationDatasetDescriptorRuleDto>())
				{
					if (r.JobMode == JobSelectionMode.SpecificJob && r.JobId is null)
						return (false, $"DescriptorType {r.DescriptorTypeId}: JobId is required for SpecificJob.", null);
				}

				// 5) Create dataset + children in a single transaction
				var dataset = new PublicationDataset
				{
					PublicationId = datasetForCreationDto.PublicationId,
					Name = datasetForCreationDto.Name.Trim()
				};

				_publicationDatasetRepository.Add(dataset);
				await _context.SaveChangesAsync();

				if (existingScaffoldIds.Count > 0)
					await _publicationDatasetRepository.AddPublicationDatasetScaffolds(dataset.Id, existingScaffoldIds);

				if ((datasetForCreationDto.DescriptorRules?.Count ?? 0) > 0)
				{
					var descriptorRules = datasetForCreationDto.DescriptorRules?.Select(dr => _modelMapper.MapToPublicationDatasetDescriptorRule(dr, dataset.Id));
					if (descriptorRules != null)
						await _publicationDatasetRepository.AddPublicationDatasetDescriptorRules(dataset.Id, descriptorRules);
				}

				await _context.SaveChangesAsync();

				var datasetToReturn = _modelMapper.MapToPublicationDatasetDto(dataset);

				return (true, "Operation successful", datasetToReturn);

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error saving publication dataset");
				return (false, "Error saving publication dataset", null);
			}
		}
		
		public async Task<(bool Succeeded, string ErrorMessage, PublicationDatasetDto? PublicationDataset)> GetPublicationDatasetByIdAsync(int datasetId)
		{
			try
			{
				var publicationDataset = await _publicationDatasetRepository.GetPublicationDatasetByIdAsync(datasetId);

				return (true, "Operation successful", publicationDataset);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error getting publication dataset");
				return (false, "Error getting publication dataset", null);
			}
		}
	}
}
