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

		public async Task<Domain?> GetByScaffoldId(int scaffoldId)
		{
			var domain = await _context.Domains
				.Where(d => d.ScaffoldId == scaffoldId)
				.FirstOrDefaultAsync();
			
			return domain;
		}
	}
}