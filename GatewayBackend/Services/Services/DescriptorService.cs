
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.Extensions.Logging;
using Repositories.IRepositories;
using Services.IServices;

namespace Services.Services
{	public class DescriptorService : IDescriptorService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IDescriptorRepository _descriptorRepository;
		private readonly IScaffoldGroupRepository _scaffoldGroupRepository;
		private readonly ILogger<DescriptorService> _logger;

		public DescriptorService(DataContext context,
			IDescriptorRepository descriptorRepository,
			IScaffoldGroupRepository scaffoldGroupRepository,
			IModelMapper modelMapper,
			ILogger<DescriptorService> logger)
		{
			_context = context;
			_modelMapper = modelMapper;
			_descriptorRepository = descriptorRepository;
			_scaffoldGroupRepository = scaffoldGroupRepository;
			_logger = logger;
		}

		public async Task<DescriptorType?> GetDescriptorByName(string descriptorName)
		{
			try
			{
				var descriptor = await _descriptorRepository.GetDescriptorByName(descriptorName);
				return descriptor;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unknown error getting descriptorType");
				return null;
			}
		}

		public async Task CreateDescriptorType(DescriptorTypeToCreateDto descriptorToCreate)
		{
			try
			{
				var descriptor = _modelMapper.MapToDescriptorType(descriptorToCreate);
				_descriptorRepository.Add(descriptor);

				await _context.SaveChangesAsync();
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error saving descriptor");
			}

		}

		public async Task<ICollection<DescriptorTypeDto>> GetAllDescriptorTypes()
		{
			try
			{
				var descriptorTypes = await _descriptorRepository.GetAllDescriptorTypes();
				var descriptorTypesToReturn = new List<DescriptorTypeDto>();

				foreach (var descriptorType in descriptorTypes)
				{
					descriptorTypesToReturn.Add(_modelMapper.MapDescriptorTypeToDto(descriptorType));
				}

				return descriptorTypesToReturn;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unknown error getting descriptors types");
				return [];
			}
		}

		public async Task<(IEnumerable<GlobalDescriptor>, IEnumerable<PoreDescriptor>, IEnumerable<OtherDescriptor>)> GetFilteredDescriptorsForScaffolds(IEnumerable<int> scaffoldIds, ScaffoldFilter filter)
		{
			var globalDescriptors = await _descriptorRepository.GetGlobalDescriptorsByScaffoldIdsAndFilter(scaffoldIds, filter);
			var poreDescriptors = await _descriptorRepository.GetPoreDescriptorsByScaffoldIdsAndFilter(scaffoldIds, filter);
			var otherDescriptors = await _descriptorRepository.GetOtherDescriptorsByScaffoldIdsAndFilter(scaffoldIds, filter);

			return (globalDescriptors, poreDescriptors, otherDescriptors);
		}

		public async Task<List<ScaffoldBaseDto>> GetScaffoldsWithDescriptorsFromScaffoldIds(List<int> scaffoldIds, ScaffoldFilter? filter)
		{
			try
			{
				var result = await _descriptorRepository.GetScaffoldsWithDescriptorsFromScaffoldIds(scaffoldIds, filter);
				return result;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unknown error getting scaffolds and descriptors from scaffold group id's");
				return new List<ScaffoldBaseDto>();
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage, PoreInfoDto? poreInfo)> GetPoreInfo(int scaffoldGroupId, int? scaffoldId = null)
		{
			try
			{
				int resolvedScaffoldId = scaffoldId ?? await _scaffoldGroupRepository
					.GetScaffoldIdsForScaffoldGroup(scaffoldGroupId)
					.ContinueWith(task => task.Result.FirstOrDefault());

				if (resolvedScaffoldId == 0) return (false, "NotFound", null);

				var poreInfo = await _descriptorRepository.GetPoreInfo(resolvedScaffoldId);

				return (true, "", poreInfo);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get pore info");
				return (false, "UnexpectedError", null);
			}

		}
		
		public async Task<(bool Succeeded, string ErrorMessage, PoreInfoScaffoldGroupDto? poreInfo)> GetPoreDescriptorInfoScaffoldGroup(int scaffoldGroupId, List<int> descriptorTypeIds)
		{
			try
			{
				var poreInfoGroup = await _descriptorRepository.GetPoreDescriptorInfoForScaffoldGroup(scaffoldGroupId, descriptorTypeIds);
				if (poreInfoGroup == null) return (false, "NotFound", null);

				return (true, "", poreInfoGroup);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to get pore info group");
				return (false, "UnexpectedError", null);
			}
		}

		// public async Task<(Dictionary<int, List<ScaffoldBaseDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>)>
		// 	GetScaffoldsAndDescriptorsFromScaffoldGroupIds(IEnumerable<int> scaffoldGroupIds)
		// {
		// 	try
		// 	{
		// 		var result = await _descriptorRepository.GetScaffoldsAndDescriptorsFromScaffoldGroupIds(scaffoldGroupIds);
		// 		return result;
		// 	}
		// 	catch (Exception ex)
		// 	{
		// 		_logger.LogError(ex, "Unknown error getting scaffolds and descriptors from scaffold group id's");
		// 		return (new Dictionary<int, List<ScaffoldBaseDto>>(),
		// 			new Dictionary<int, List<DescriptorDto>>(),
		// 			new Dictionary<int, List<DescriptorDto>>(),
		// 			new Dictionary<int, List<DescriptorDto>>()
		// 		);
		// 	}
		// }
	}
}


