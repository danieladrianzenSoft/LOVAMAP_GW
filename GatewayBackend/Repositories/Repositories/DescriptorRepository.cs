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

		public async Task<List<ScaffoldBaseDto>> GetScaffoldsWithDescriptorsFromScaffoldIds(List<int> scaffoldIds, ScaffoldFilter? filter)
		{
			var descriptorIdSet = (filter?.DescriptorIds != null && filter.DescriptorIds.Any())
				? new HashSet<int>(filter.DescriptorIds)
				: null;

			// Scaffolds
			var scaffolds = await _context.Scaffolds
				.Where(s => scaffoldIds.Contains(s.Id))
				.Select(s => new ScaffoldBaseDto
				{
					Id = s.Id,
					ReplicateNumber = s.ReplicateNumber,
					ScaffoldGroupId = s.ScaffoldGroupId
				})
				.ToListAsync();

			if (filter?.NumReplicatesByGroup?.Count > 0)
			{
				scaffolds = scaffolds
					.GroupBy(s => s.ScaffoldGroupId)
					.SelectMany(g =>
					{
						if (filter.NumReplicatesByGroup.TryGetValue(g.Key, out var numReps))
						{
							return g
								.OrderBy(s => s.ReplicateNumber) // or by s.Id
								.Take(numReps);
						}
						return g;
					})
					.ToList();
			}

			var scaffoldIdSet = scaffolds.Select(s => s.Id).ToHashSet();

			// Global descriptors
			var globalDescriptorQuery = from gd in _context.GlobalDescriptors
										join dt in _context.DescriptorTypes on gd.DescriptorTypeId equals dt.Id
										where scaffoldIdSet.Contains(gd.ScaffoldId)
										select new { gd, dt };

			if (descriptorIdSet != null && descriptorIdSet.Any())
			{
				globalDescriptorQuery = globalDescriptorQuery
					.Where(x => descriptorIdSet.Contains(x.dt.Id));
			}

			var globalDescriptors = await globalDescriptorQuery
				.Select(x => new
				{
					x.gd.ScaffoldId,
					Descriptor = new DescriptorDto
					{
						Id = x.gd.Id,
						DescriptorTypeId = x.gd.DescriptorTypeId,
						Name = x.dt.Name,
						Label = x.dt.Label,
						TableLabel = x.dt.TableLabel,
						Unit = x.dt.Unit,
						Values = x.gd.ValueString ?? x.gd.ValueInt.ToString() ?? x.gd.ValueDouble.ToString() ?? "N/A"
					}
				})
				.ToListAsync();

			// Pore descriptors
			var poreDescriptorQuery = from pd in _context.PoreDescriptors
									join dt in _context.DescriptorTypes on pd.DescriptorTypeId equals dt.Id
									where scaffoldIdSet.Contains(pd.ScaffoldId)
									select new { pd, dt };

			if (descriptorIdSet != null && descriptorIdSet.Any())
			{
				poreDescriptorQuery = poreDescriptorQuery
					.Where(x => descriptorIdSet.Contains(x.dt.Id));
			}

			var poreDescriptors = await poreDescriptorQuery
				.Select(x => new
				{
					x.pd.ScaffoldId,
					Descriptor = new DescriptorDto
					{
						Id = x.pd.Id,
						DescriptorTypeId = x.pd.DescriptorTypeId,
						Name = x.dt.Name,
						Label = x.dt.Label,
						TableLabel = x.dt.TableLabel,
						Unit = x.dt.Unit,
						Values = ParsingMethods.JsonDocumentToString(x.pd.Values)
					}
				})
				.ToListAsync();

			// Other descriptors
			var otherDescriptorQuery = from od in _context.OtherDescriptors
									join dt in _context.DescriptorTypes on od.DescriptorTypeId equals dt.Id
									where scaffoldIdSet.Contains(od.ScaffoldId)
									select new { od, dt };

			if (descriptorIdSet != null && descriptorIdSet.Any())
			{
				otherDescriptorQuery = otherDescriptorQuery
					.Where(x => descriptorIdSet.Contains(x.dt.Id));
			}

			var otherDescriptors = await otherDescriptorQuery
				.Select(x => new
				{
					x.od.ScaffoldId,
					Descriptor = new DescriptorDto
					{
						Id = x.od.Id,
						DescriptorTypeId = x.od.DescriptorTypeId,
						Name = x.dt.Name,
						Label = x.dt.Label,
						TableLabel = x.dt.TableLabel,
						Unit = x.dt.Unit,
						Values = ParsingMethods.JsonDocumentToString(x.od.Values)
					}
				})
				.ToListAsync();

			// Grouping descriptors by scaffold
			var globalDescriptorLookup = globalDescriptors
				.GroupBy(d => d.ScaffoldId)
				.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

			var poreDescriptorLookup = poreDescriptors
				.GroupBy(d => d.ScaffoldId)
				.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

			var otherDescriptorLookup = otherDescriptors
				.GroupBy(d => d.ScaffoldId)
				.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

			// Assigning descriptors to scaffolds
			foreach (var scaffold in scaffolds)
			{
				scaffold.GlobalDescriptors = globalDescriptorLookup.TryGetValue(scaffold.Id, out var globals)
					? globals
					: [];

				scaffold.PoreDescriptors = poreDescriptorLookup.TryGetValue(scaffold.Id, out var pores)
					? pores
					: [];

				scaffold.OtherDescriptors = otherDescriptorLookup.TryGetValue(scaffold.Id, out var others)
					? others
					: [];
			}

			return scaffolds;
		}

		public async Task<PoreInfoDto?> GetPoreInfo(int scaffoldId)
		{
			var descriptorTypeIds = new List<int> { 22, 27 };

			var descriptors = await _context.PoreDescriptors
				.AsNoTracking()
				.Where(pd => pd.ScaffoldId == scaffoldId && descriptorTypeIds.Contains(pd.DescriptorTypeId))
				.Select(pd => new
				{
					pd.DescriptorTypeId,
					pd.Values,
					pd.Scaffold.ScaffoldGroupId // this works even if Scaffold is lazy-loaded, since it's projected
				})
				.ToListAsync();

			var poreVolume = descriptors.FirstOrDefault(d => d.DescriptorTypeId == 22)?.Values;
			var poreAspectRatio = descriptors.FirstOrDefault(d => d.DescriptorTypeId == 27)?.Values;
			var scaffoldGroupId = descriptors.FirstOrDefault()?.ScaffoldGroupId ?? 0;

			if (poreVolume == null || poreAspectRatio == null)
				return null;

			return new PoreInfoDto
			{
				ScaffoldId = scaffoldId,
				ScaffoldGroupId = scaffoldGroupId,
				PoreVolume = poreVolume,
				PoreAspectRatio = poreAspectRatio
			};
		}

		// public async Task<(Dictionary<int, List<ScaffoldBaseDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>, Dictionary<int, List<DescriptorDto>>)>
		// 	GetScaffoldsAndDescriptorsFromScaffoldGroupIds(IEnumerable<int> scaffoldGroupIds)
		// {
		// 	// Fetch scaffolds grouped by scaffold group ID
		// 	var scaffolds = await _context.Scaffolds
		// 		.Where(s => scaffoldGroupIds.Contains(s.ScaffoldGroupId))
		// 		.Select(s => new
		// 		{
		// 			s.ScaffoldGroupId,
		// 			Scaffold = new ScaffoldBaseDto
		// 			{
		// 				Id = s.Id,
		// 				ReplicateNumber = s.ReplicateNumber
		// 			}
		// 		})
		// 		.ToListAsync();

		// 	var scaffoldLookup = scaffolds
		// 		.GroupBy(s => s.ScaffoldGroupId)
		// 		.ToDictionary(g => g.Key, g => g.Select(s => s.Scaffold).ToList());

		// 	// Fetch all descriptors in one go, grouped by scaffold ID
		// 	var globalDescriptors = await (
		// 		from gd in _context.GlobalDescriptors
		// 		join dt in _context.DescriptorTypes on gd.DescriptorTypeId equals dt.Id
		// 		where scaffolds.Select(s => s.Scaffold.Id).Contains(gd.ScaffoldId)
		// 		select new
		// 		{
		// 			gd.ScaffoldId,
		// 			Descriptor = new DescriptorDto
		// 			{
		// 				Id = gd.Id,
		// 				DescriptorTypeId = gd.DescriptorTypeId,
		// 				Name = dt.Name,
		// 				Label = dt.Label,
		// 				TableLabel = dt.TableLabel,
		// 				Unit = dt.Unit,
		// 				Values = gd.ValueString ?? gd.ValueInt.ToString() ?? gd.ValueDouble.ToString() ?? "N/A"
		// 			}
		// 		})
		// 		.ToListAsync();

			// var poreDescriptors = await (
			// 	from pd in _context.PoreDescriptors
			// 	join dt in _context.DescriptorTypes on pd.DescriptorTypeId equals dt.Id
			// 	where scaffolds.Select(s => s.Scaffold.Id).Contains(pd.ScaffoldId)
			// 	select new
			// 	{
			// 		pd.ScaffoldId,
			// 		Descriptor = new DescriptorDto
			// 		{
			// 			Id = pd.Id,
			// 			DescriptorTypeId = pd.DescriptorTypeId,
			// 			Name = dt.Name,
			// 			Label = dt.Label,
			// 			TableLabel = dt.TableLabel,
			// 			Unit = dt.Unit,
			// 			Values = ParsingMethods.JsonDocumentToString(pd.Values)
			// 		}
			// 	})
			// 	.ToListAsync();

		// 	var otherDescriptors = await (
		// 		from od in _context.OtherDescriptors
		// 		join dt in _context.DescriptorTypes on od.DescriptorTypeId equals dt.Id
		// 		where scaffolds.Select(s => s.Scaffold.Id).Contains(od.ScaffoldId)
		// 		select new
		// 		{
		// 			od.ScaffoldId,
		// 			Descriptor = new DescriptorDto
		// 			{
		// 				Id = od.Id,
		// 				DescriptorTypeId = od.DescriptorTypeId,
		// 				Name = dt.Name,
		// 				Label = dt.Label,
		// 				TableLabel = dt.TableLabel,
		// 				Unit = dt.Unit,
		// 				Values = ParsingMethods.JsonDocumentToString(od.Values)
		// 			}
		// 		})
		// 		.ToListAsync();

		// 	// Convert descriptor lists into dictionary lookups
		// 	var globalDescriptorLookup = globalDescriptors
		// 		.GroupBy(d => d.ScaffoldId)
		// 		.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

		// 	var poreDescriptorLookup = poreDescriptors
		// 		.GroupBy(d => d.ScaffoldId)
		// 		.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

		// 	var otherDescriptorLookup = otherDescriptors
		// 		.GroupBy(d => d.ScaffoldId)
		// 		.ToDictionary(g => g.Key, g => g.Select(d => d.Descriptor).ToList());

		// 	return (scaffoldLookup, globalDescriptorLookup, poreDescriptorLookup, otherDescriptorLookup);
		// }

	}
}
