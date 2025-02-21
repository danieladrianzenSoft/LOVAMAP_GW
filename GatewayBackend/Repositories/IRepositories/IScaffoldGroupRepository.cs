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
		Task<ScaffoldGroupSummaryDto?> GetSummary(int id);
		Task<ICollection<Image>> GetScaffoldGroupImages(int scaffoldGroupId);
		Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroups(ScaffoldFilter filter, string userId);
		Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroupsByRelevance_v1(ScaffoldFilter filter, string currentUserId);
		Task<ICollection<ScaffoldGroupSummaryDto>?> GetFilteredScaffoldGroupSummaries(ScaffoldFilter filter, string currentUserId);

	}
}