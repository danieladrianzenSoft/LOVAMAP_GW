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
				.Where(d => d.MeshFilePath != null)
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
	}
}