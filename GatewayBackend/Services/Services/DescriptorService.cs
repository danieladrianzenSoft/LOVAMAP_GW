
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Repositories.IRepositories;
using Services.IServices;

namespace Services.Services
{	public class DescriptorService : IDescriptorService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IDescriptorRepository _descriptorRepository;

		public DescriptorService(DataContext context, IModelMapper modelMapper, IDescriptorRepository descriptorRepository)
		{
			_context = context;
			_modelMapper = modelMapper;
			_descriptorRepository = descriptorRepository;
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
				throw new ApplicationException("Error saving descriptor", ex);
			}
			
		}

		public async Task<(IEnumerable<GlobalDescriptor>, IEnumerable<PoreDescriptor>, IEnumerable<OtherDescriptor>)> GetFilteredDescriptorsForScaffolds(IEnumerable<int> scaffoldIds, ScaffoldFilter filter)
		{
			var globalDescriptors = await _descriptorRepository.GetGlobalDescriptorsByScaffoldIdsAndFilter(scaffoldIds, filter);
			var poreDescriptors = await _descriptorRepository.GetPoreDescriptorsByScaffoldIdsAndFilter(scaffoldIds, filter);
			var otherDescriptors = await _descriptorRepository.GetOtherDescriptorsByScaffoldIdsAndFilter(scaffoldIds, filter);
			
			return (globalDescriptors, poreDescriptors, otherDescriptors);
		}
	}
}


