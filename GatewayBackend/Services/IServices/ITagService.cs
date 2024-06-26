using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface ITagService
	{
		Task CreateTags(IEnumerable<TagToCreateDto> tagsToCreate);
		Task<ICollection<TagForFilterDto>> GetAutogeneratedTags();
		Task<ICollection<ScaffoldTag>> GetAutogeneratedTagsForScaffold(ScaffoldGroup scaffoldGroup);
	}
}