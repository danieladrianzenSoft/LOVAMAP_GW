using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IScaffoldGroupService
	{
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupBaseDto? CreatedScaffoldGroup)> CreateScaffoldGroup(ScaffoldGroupToCreateDto scaffoldGroupToCreate, string? userId);
		Task<(bool Succeeded, string ErrorMessage, IEnumerable<ScaffoldGroupBaseDto>? CreatedScaffoldGroups)> CreateScaffoldGroups(IEnumerable<ScaffoldGroupToCreateDto> scaffoldGroupsToCreate, string? userId);
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupBaseDto? scaffoldGroup)> GetScaffoldGroup(int id, string userId, int? numReplicates);
		Task<(bool Succeeded, string ErrorMessage, IEnumerable<ScaffoldGroupBaseDto>? scaffoldGroups)> GetFilteredScaffoldGroups(ScaffoldFilter filters, string userId, bool isDetailed=false);
		Task<(bool Succeeded, string ErrorMessage, ICollection<ImageToShowDto>? scaffoldGroupImages)> GetScaffoldGroupImages(int scaffoldGroupId);
		Task<(bool Succeeded, string ErrorMessage, ScaffoldGroupSummaryDto? updatedScaffoldGroup)> UpdateScaffoldGroupImage(string userId, int scaffoldGroupId, ImageToUpdateDto image);

	}
}