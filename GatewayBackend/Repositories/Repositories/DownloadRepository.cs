using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;

namespace Repositories.Repositories
{
	public class DownloadRepository : IDownloadRepository
	{
		private readonly DataContext _context;

		public DownloadRepository(DataContext context)
		{
			_context = context;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(Download download)
		{
			_context.Downloads.Add(download);
		}

	}
}
