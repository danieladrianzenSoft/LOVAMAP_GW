using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Repositories.IRepositories;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using System.Collections.Immutable;

namespace Repositories.Repositories
{
	public class DescriptorRepository : IDescriptorRepository
	{
		private readonly DataContext _context;

		public DescriptorRepository(DataContext context)
		{
			_context = context;
		}
		
		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(DescriptorType descriptor)
		{
			_context.DescriptorTypes.Add(descriptor);
		}
		public async Task<DescriptorType?> GetDescriptorById(int id)
		{
			return await _context.DescriptorTypes.FindAsync(id);
		}

		public async Task<DescriptorType?> GetDescriptorByName(string name)
		{
			return await _context.DescriptorTypes.Where(d => d.Name.ToLower() == name.ToLower()).FirstOrDefaultAsync();
		}

		public async Task<ICollection<DescriptorType>> GetAllDescriptorTypes()
		{
			return await _context.DescriptorTypes.ToListAsync();
		}
		
		public async Task<ICollection<GlobalDescriptor>> GetGlobalDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter)
		{
			var query = _context.GlobalDescriptors.AsQueryable();

			query = query.Where(gd => scaffoldIds.Contains(gd.ScaffoldId));

			// Handling descriptor filtering by id & name
			if (filter.DescriptorIds?.Count > 0 || filter.Descriptors?.Count > 0)
			{
				var descriptorIds = filter.DescriptorIds ?? new List<int>();
				var descriptorNames = filter.Descriptors?.Select(sg => sg.ToLower()) ?? new List<string>();

				query = query.Where(sg => descriptorIds.Contains(sg.DescriptorTypeId) || descriptorNames.Contains(sg.DescriptorType.Name.ToLower()));
			}

    		var descriptors = await query.Include(gd => gd.DescriptorType).ToListAsync();
			// return descriptors.GroupBy(gd => gd.DescriptorTypeId)
			// 				.Select(group => group.First())
			// 				.ToList();
			return descriptors;
		}

		public async Task<ICollection<PoreDescriptor>> GetPoreDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter)
		{
			var query = _context.PoreDescriptors.AsQueryable();

			query = query.Where(gd => scaffoldIds.Contains(gd.ScaffoldId));

			// Handling descriptor filtering by id & name
			if (filter.DescriptorIds?.Count > 0 || filter.Descriptors?.Count > 0)
			{
				var descriptorIds = filter.DescriptorIds ?? new List<int>();
				var descriptorNames = filter.Descriptors?.Select(sg => sg.ToLower()) ?? new List<string>();

				query = query.Where(sg => descriptorIds.Contains(sg.DescriptorTypeId) || descriptorNames.Contains(sg.DescriptorType.Name.ToLower()));
			}


			var descriptors = await query.Include(sg => sg.DescriptorType).ToListAsync();
			// return descriptors.GroupBy(gd => gd.DescriptorTypeId)
			// 				.Select(group => group.First())
			// 				.ToList();
			return descriptors;
		}
		public async Task<ICollection<OtherDescriptor>> GetOtherDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter)
		{
			var query = _context.OtherDescriptors.AsQueryable();

			query = query.Where(gd => scaffoldIds.Contains(gd.ScaffoldId));

			// Handling descriptor filtering by id & name
			if (filter.DescriptorIds?.Count > 0 || filter.Descriptors?.Count > 0)
			{
				var descriptorIds = filter.DescriptorIds ?? new List<int>();
				var descriptorNames = filter.Descriptors?.Select(sg => sg.ToLower()) ?? new List<string>();

				query = query.Where(sg => descriptorIds.Contains(sg.DescriptorTypeId) || descriptorNames.Contains(sg.DescriptorType.Name.ToLower()));
			}

			// Ensure results are distinct by DescriptorTypeId
			var descriptors = await query.Include(sg => sg.DescriptorType).ToListAsync();
			// return descriptors.GroupBy(gd => gd.DescriptorTypeId)
			// 				.Select(group => group.First())
			// 				.ToList();
			return descriptors;
		}

	}
}
