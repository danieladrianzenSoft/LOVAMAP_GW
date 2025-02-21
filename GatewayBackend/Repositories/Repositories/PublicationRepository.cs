using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;

namespace Repositories.Repositories
{
	public class PublicationRepository : IPublicationRepository
	{
		private readonly DataContext _context;

		public PublicationRepository(DataContext context)
		{
			_context = context;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(Publication publication)
		{
			_context.Publications.Add(publication);
		}

	}
}