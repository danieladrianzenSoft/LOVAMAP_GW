using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Repositories.IRepositories;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Infrastructure.Helpers;
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
			return await _context.DescriptorTypes.Include(d => d.Publication).ToListAsync();
		}
		
		public async Task<ICollection<GlobalDescriptor>> GetGlobalDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter)
		{
			var query = _context.GlobalDescriptors.AsQueryable();

			query = query.Where(gd => scaffoldIds.Contains(gd.ScaffoldId));

			// Handling descriptor filtering by id & name
			if (filter.DescriptorIds?.Count > 0)
			{
				var descriptorIds = filter.DescriptorIds ?? new List<int>();

				query = query.Where(sg => descriptorIds.Contains(sg.DescriptorTypeId));
			}

    		var descriptors = await query.Include(gd => gd.DescriptorType).ToListAsync();

			return descriptors;
		}

		public async Task<ICollection<PoreDescriptor>> GetPoreDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter)
		{
			var query = _context.PoreDescriptors.AsQueryable();

			query = query.Where(gd => scaffoldIds.Contains(gd.ScaffoldId));

			// Handling descriptor filtering by id & name
			if (filter.DescriptorIds?.Count > 0)
			{
				var descriptorIds = filter.DescriptorIds ?? new List<int>();

				query = query.Where(sg => descriptorIds.Contains(sg.DescriptorTypeId));
			}

			var descriptors = await query.Include(sg => sg.DescriptorType).ToListAsync();

			return descriptors;

		}
		public async Task<ICollection<OtherDescriptor>> GetOtherDescriptorsByScaffoldIdsAndFilter(IEnumerable<int> scaffoldIds, ScaffoldFilter filter)
		{
			var query = _context.OtherDescriptors.AsQueryable();

			query = query.Where(gd => scaffoldIds.Contains(gd.ScaffoldId));

			// Handling descriptor filtering by id & name
			if (filter.DescriptorIds?.Count > 0)
			{
				var descriptorIds = filter.DescriptorIds ?? new List<int>();

				query = query.Where(sg => descriptorIds.Contains(sg.DescriptorTypeId));
			}

			// Ensure results are distinct by DescriptorTypeId
			var descriptors = await query.Include(sg => sg.DescriptorType).ToListAsync();

			return descriptors;
		}

		public async Task<(Dictionary<int, List<ScaffoldBaseDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>)>
			GetScaffoldsAndDescriptorsFromScaffoldGroupIds(IEnumerable<int> scaffoldGroupIds)
		{
			// Fetch scaffolds grouped by scaffold group ID
			var scaffolds = await _context.Scaffolds
				.Where(s => scaffoldGroupIds.Contains(s.ScaffoldGroupId))
				.Select(s => new
				{
					s.ScaffoldGroupId,
					Scaffold = new ScaffoldBaseDto
					{
						Id = s.Id,
						ReplicateNumber = s.ReplicateNumber
					}
				})
				.ToListAsync();

			var scaffoldLookup = scaffolds
				.GroupBy(s => s.ScaffoldGroupId)
				.ToDictionary(g => g.Key, g => g.Select(s => s.Scaffold).ToList());

			// Fetch all descriptors in one go, grouped by scaffold ID
			var globalDescriptors = await (
				from gd in _context.GlobalDescriptors
				join dt in _context.DescriptorTypes on gd.DescriptorTypeId equals dt.Id
				where scaffolds.Select(s => s.Scaffold.Id).Contains(gd.ScaffoldId)
				select new
				{
					gd.ScaffoldId,
					Descriptor = new DescriptorDto
					{
						Id = gd.Id,
						DescriptorTypeId = gd.DescriptorTypeId,
						Name = dt.Name,
						Label = dt.Label,
						TableLabel = dt.TableLabel,
						Unit = dt.Unit,
						Values = gd.ValueString ?? gd.ValueInt.ToString() ?? gd.ValueDouble.ToString() ?? "N/A"
					}
				})
				.ToListAsync();

			var poreDescriptors = await (
				from pd in _context.PoreDescriptors
				join dt in _context.DescriptorTypes on pd.DescriptorTypeId equals dt.Id
				where scaffolds.Select(s => s.Scaffold.Id).Contains(pd.ScaffoldId)
				select new
				{
					pd.ScaffoldId,
					Descriptor = new DescriptorDto
					{
						Id = pd.Id,
						DescriptorTypeId = pd.DescriptorTypeId,
						Name = dt.Name,
						Label = dt.Label,
						TableLabel = dt.TableLabel,
						Unit = dt.Unit,
						Values = ParsingMethods.JsonDocumentToString(pd.Values)
					}
				})
				.ToListAsync();

			var otherDescriptors = await (
				from od in _context.OtherDescriptors
				join dt in _context.DescriptorTypes on od.DescriptorTypeId equals dt.Id
				where scaffolds.Select(s => s.Scaffold.Id).Contains(od.ScaffoldId)
				select new
				{
					od.ScaffoldId,
					Descriptor = new DescriptorDto
					{
						Id = od.Id,
						DescriptorTypeId = od.DescriptorTypeId,
						Name = dt.Name,
						Label = dt.Label,
						TableLabel = dt.TableLabel,
						Unit = dt.Unit,
						Values = ParsingMethods.JsonDocumentToString(od.Values)
					}
				})
				.ToListAsync();

			// Convert descriptor lists into dictionary lookups
			var globalDescriptorLookup = globalDescriptors
				.GroupBy(d => d.ScaffoldId)
				.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

			var poreDescriptorLookup = poreDescriptors
				.GroupBy(d => d.ScaffoldId)
				.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

			var otherDescriptorLookup = otherDescriptors
				.GroupBy(d => d.ScaffoldId)
				.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

			return (scaffoldLookup, globalDescriptorLookup, poreDescriptorLookup, otherDescriptorLookup);
		}

	}
}
