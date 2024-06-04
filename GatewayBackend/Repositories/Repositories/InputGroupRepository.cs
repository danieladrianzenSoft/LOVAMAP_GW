using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;

namespace Repositories.Repositories
{
	public class InputGroupRepository : IInputGroupRepository
	{
		private readonly DataContext _context;

		public InputGroupRepository(DataContext context)
		{
			_context = context;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(InputGroup inputGroup)
		{
			_context.InputGroups.Add(inputGroup);
		}

	}
}


