using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
    public interface IAISearchRepository
    {
		bool HasChanges();
		void Add(AISearch aiSearch);		
	}
}