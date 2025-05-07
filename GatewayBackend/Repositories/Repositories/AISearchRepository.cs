using Microsoft.EntityFrameworkCore;
using Repositories.IRepositories;
using Data;
using Data.Models;

namespace Repositories.Repositories
{
	public class AISearchRepository : IAISearchRepository
	{
		private readonly DataContext _context;

		public AISearchRepository(DataContext context)
		{
			_context = context;
		}
		
		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(AISearch aiSearch)
		{
			_context.AISearches.Add(aiSearch);
		}
	}
}