using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IAISearchService
	{
		Task<(bool Succeeded, string ErrorMessage, AIScaffoldSearchResponse? searchResponse)> RunSearchScaffoldGroupPipeline(string searchPrompt, string userId, bool? isSimulated = null, List<string>? shapeTagNames = null);

		Task<(bool Succeeded, string ErrorMessage, ScaffoldFilter? scaffoldFilter)> SearchScaffoldGroup(string searchPrompt, List<string>? shapeTagNames = null, bool? isSimulated = null);
		
	}
}