using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;

namespace Repositories.IRepositories
{
    public interface IInputGroupRepository
    {
		bool HasChanges();
		void Add(InputGroup inputGroup);
	}
}