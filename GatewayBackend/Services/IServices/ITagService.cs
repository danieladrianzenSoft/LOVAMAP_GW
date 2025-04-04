using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface ITagService
	{
		Task CreateTags(IEnumerable<TagToCreateDto> tagsToCreate);
		Task SeedTags(IEnumerable<TagToSeedDto> tagsToSeed);
		Task<ICollection<TagForFilterDto>> GetAutogeneratedTags();
		Task<ICollection<ScaffoldTag>> GetAutogeneratedTagsForScaffold(ScaffoldGroup scaffoldGroup);
		Task<Dictionary<int, List<string>>> GetTagNamesForScaffoldGroups(IEnumerable<int> scaffoldGroupIds, string userId);
	}
}