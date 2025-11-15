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
		public void Delete(ScaffoldGroup scaffoldGroup);
		Task<ScaffoldGroup?> Get(int id);
		Task<List<int>> GetAllIds();
		Task<HashSet<int>> GetExistingScaffoldIdsAsync(IEnumerable<int> scaffoldIds);
		Task<int> GetRandomScaffoldGroupId();
		Task<List<ScaffoldGroup>> GetWithInputDataByIds(List<int> ids);
		Task<ScaffoldGroupSummaryDto?> GetSummary(int id);
		Task<ScaffoldGroupSummaryDto?> GetSummaryByScaffoldId(int scaffoldId);
		Task<List<int>> GetScaffoldIdsForScaffoldGroup(int scaffoldGroupId);
		Task<List<ScaffoldMissingThumbnailInfoDto>> GetScaffoldsMissingThumbnailsByCategory(ImageCategory imageCategory = ImageCategory.Particles);
		Task<ICollection<Image>> GetScaffoldGroupImages(int scaffoldGroupId);
		Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroups(ScaffoldFilter filter, string userId);
		Task<ICollection<ScaffoldGroup>?> GetFilteredScaffoldGroupsByRelevance_v1(ScaffoldFilter filter, string currentUserId);
		Task<ICollection<ScaffoldGroupSummaryDto>?> GetFilteredScaffoldGroupSummaries(ScaffoldFilter filter, string currentUserId);

	}
}