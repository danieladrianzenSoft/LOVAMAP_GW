using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IScaffoldGroupService
	{
		Task<List<int>> GetAllIds();
		Task<int> GetRandomScaffoldGroupId();
		Task<(bool Succeeded, string ErrorMessage, BatchOperationResult? result)> ResetNamesAndComments(List<int> ids);
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupBaseDto? CreatedScaffoldGroup)> CreateScaffoldGroup(ScaffoldGroupToCreateDto scaffoldGroupToCreate, string? userId);
		Task<(bool Succeeded, string ErrorMessage, IEnumerable<ScaffoldGroupBaseDto>? CreatedScaffoldGroups)> CreateScaffoldGroups(IEnumerable<ScaffoldGroupToCreateDto> scaffoldGroupsToCreate, string? userId);
		Task<(bool Succeeded, string ErrorMessage)> DeleteScaffoldGroup(int scaffoldGroupId, string userId);
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupBaseDto? scaffoldGroup)> GetScaffoldGroup(int id, string userId, int? numReplicates);
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupSummaryDto? scaffoldGroup)> GetScaffoldGroupSummary(int id, string userId);
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupSummaryDto? scaffoldGroup)> GetScaffoldGroupSummaryByScaffoldId(int scaffoldId, string userId);
		// Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupDataDto? Result)> GetDataForVisualization(int scaffoldGroupId);
		// Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupDataDto? Result)> GetDataForVisualization(int scaffoldGroupId, string? userId);
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupDataDto? Result)> GetDataForVisualization(int scaffoldGroupId, string? userId, List<int> descriptorTypeIds);
		Task<(bool Succeeded, string ErrorMessage, IEnumerable<ScaffoldGroupBaseDto>? scaffoldGroups)> GetFilteredScaffoldGroups(ScaffoldFilter filters, string userId, bool isDetailed=false);
		Task<(bool Succeeded, string ErrorMessage, ICollection<ImageToShowDto>? scaffoldGroupImages)> GetScaffoldGroupImages(int scaffoldGroupId);
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupSummaryDto? updatedScaffoldGroup)> UpdateScaffoldGroupImage(string userId, int scaffoldGroupId, ImageToUpdateDto image);
		Task<List<ScaffoldMissingThumbnailInfoDto>> GetScaffoldsMissingThumbnailsByCategory(ImageCategory imageCategory = ImageCategory.Particles);

	}
}