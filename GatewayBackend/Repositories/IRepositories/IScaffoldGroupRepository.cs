using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
    public interface IScaffoldGroupRepository
    {
		bool HasChanges();
		void Add(ScaffoldGroup experiment);
		Task<ScaffoldGroup?> Get(int id);
		Task<ICollection<Image>> GetScaffoldGroupImages(int scaffoldGroupId);
		Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroups(ScaffoldFilter filter, string userId);
		Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroupsByRelevance(ScaffoldFilter filter, string currentUserId);



	}
}