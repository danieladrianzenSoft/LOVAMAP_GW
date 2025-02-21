using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;

namespace Repositories.IRepositories
{
    public interface IPublicationRepository
    {
		bool HasChanges();
		void Add(Publication publication);
	}
}