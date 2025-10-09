using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;

namespace Repositories.Repositories
{
	public class LovamapCoreJobRepository : ILovamapCoreJobRepository
	{
		private readonly DataContext _context;

		public LovamapCoreJobRepository(DataContext context)
		{
			_context = context;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(Job job)
		{
			_context.Jobs.Add(job);
		}

	}
}