using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
    public interface IDomainRepository
    {
		bool HasChanges();
		void Add(Domain domain);
		Task<Domain?> GetByScaffoldId(int scaffoldId);
	}
}