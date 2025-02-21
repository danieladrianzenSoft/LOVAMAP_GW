
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
		private readonly ILogger<DescriptorService> _logger;

		public DescriptorService(DataContext context, IModelMapper modelMapper, IDescriptorRepository descriptorRepository, ILogger<DescriptorService> logger)
		{
			_context = context;
			_modelMapper = modelMapper;
			_descriptorRepository = descriptorRepository;
			_logger = logger;
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

		public async Task<(Dictionary<int, List<ScaffoldBaseDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>)>
			GetScaffoldsAndDescriptorsFromScaffoldGroupIds(IEnumerable<int> scaffoldGroupIds)
		{
			try
			{
				var result = await _descriptorRepository.GetScaffoldsAndDescriptorsFromScaffoldGroupIds(scaffoldGroupIds);
				return result;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unknown error getting scaffolds and descriptors from scaffold group id's");
				return (new Dictionary<int, List<ScaffoldBaseDto>>(),
					new Dictionary<int, List<DescriptorDto>>(),
					new Dictionary<int, List<DescriptorDto>>(),
					new Dictionary<int, List<DescriptorDto>>()
				);
			}
		}
	}
}


