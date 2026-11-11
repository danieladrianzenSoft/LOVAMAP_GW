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
using System.Text.Json;

namespace Repositories.Repositories
{
	public class DomainRepository : IDomainRepository
	{
		private readonly DataContext _context;

		public DomainRepository(DataContext context)
		{
			_context = context;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(Domain domain)
		{
			_context.Domains.Add(domain);
		}

		public void Update(Domain domain)
		{
			_context.Domains.Update(domain);
		}

		public void Delete(Domain domain)
		{
			_context.Domains.Remove(domain);
		}

		public async Task<Domain?> GetById(int domainId)
		{
			var domain = await _context.Domains.FirstOrDefaultAsync(d => d.Id == domainId);

			return domain;
		}

		public async Task<Domain?> GetByScaffoldIdAndCategory(int scaffoldId, DomainCategory category)
		{
			var domain = await _context.Domains
				.Where(d => d.ScaffoldId == scaffoldId && d.Category == category)
				.FirstOrDefaultAsync();

			return domain;
		}

		public async Task<int?> GetRandomDomainIdWithMeshAsync()
		{
			var domain = await _context.Domains
				.Where(d => d.MeshFilePath != null && d.Category == DomainCategory.Particles)
				.OrderBy(d => Guid.NewGuid())
				.Select(d => d.ScaffoldId)
				.FirstOrDefaultAsync();

			return domain == 0 ? null : domain;
		}

		public async Task<JsonDocument?> GetDomainMetadataById(int domainId)
		{
			var domainMetadata = await _context.Domains
				.Where(d => d.Id == domainId)
				.Select(d => d.Metadata)
				.FirstOrDefaultAsync();

			return domainMetadata;
		}

		public async Task<PagedList<DomainListItemDto>> GetFilteredList(DomainFilterParams filterParams)
		{
			var query = _context.Domains
				.AsNoTracking()
				.Include(d => d.Scaffold)
				.AsQueryable();

			if (!string.IsNullOrEmpty(filterParams.Category))
			{
				if (Enum.TryParse<DomainCategory>(filterParams.Category, true, out var cat))
					query = query.Where(d => d.Category == cat);
			}

			if (filterParams.HasMetadata.HasValue)
			{
				query = filterParams.HasMetadata.Value
					? query.Where(d => d.Metadata != null)
					: query.Where(d => d.Metadata == null);
			}

			if (filterParams.HasMesh.HasValue)
			{
				query = filterParams.HasMesh.Value
					? query.Where(d => d.MeshFilePath != null)
					: query.Where(d => d.MeshFilePath == null);
			}

			if (!string.IsNullOrEmpty(filterParams.Search))
			{
				query = query.Where(d => d.OriginalFileName != null && d.OriginalFileName.Contains(filterParams.Search));
			}

			var projected = query
				.OrderByDescending(d => d.CreatedAt)
				.Select(d => new DomainListItemDto
				{
					Id = d.Id,
					ScaffoldId = d.ScaffoldId,
					ScaffoldGroupId = d.Scaffold.ScaffoldGroupId,
					Category = d.Category.ToString(),
					OriginalFileName = d.OriginalFileName,
					HasMesh = d.MeshFilePath != null,
					HasMetadata = d.Metadata != null,
					CreatedAt = d.CreatedAt
				});

			return await PagedList<DomainListItemDto>.CreateAsync(projected, filterParams.PageNumber, filterParams.PageSize);
		}

		public async Task<DomainSummaryDto> GetSummary()
		{
			var summary = await _context.Domains
				.AsNoTracking()
				.GroupBy(_ => 1)
				.Select(g => new DomainSummaryDto
				{
					TotalDomains = g.Count(),
					WithMesh = g.Count(d => d.MeshFilePath != null),
					WithMetadata = g.Count(d => d.Metadata != null),
					WithoutMetadata = g.Count(d => d.Metadata == null),
					ParticleCount = g.Count(d => d.Category == DomainCategory.Particles),
					PoreCount = g.Count(d => d.Category == DomainCategory.Pores)
				})
				.FirstOrDefaultAsync();

			return summary ?? new DomainSummaryDto();
		}
	}
}