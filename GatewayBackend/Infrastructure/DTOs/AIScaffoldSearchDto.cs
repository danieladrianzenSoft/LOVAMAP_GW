using System.Text.Json;
using Data.Models;

namespace Infrastructure.DTOs
{
	public class AIScaffoldSearchResponse
	{
		public IEnumerable<ScaffoldGroupSummaryDto> ScaffoldGroups { get; set; } = new List<ScaffoldGroupSummaryDto>();
		public List<TagForFilterDto> SelectedTags { get; set; } = new List<TagForFilterDto>();
		public List<int> SelectedParticleSizes { get; set; } = new List<int>();
	}
}

