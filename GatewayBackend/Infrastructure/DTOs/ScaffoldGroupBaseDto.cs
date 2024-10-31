namespace Infrastructure.DTOs
{
	public class ScaffoldGroupBaseDto
	{
		public int Id { get; set; }
		public string Name { get; set; }
		public DateTime CreatedAt { get; set; }
		public bool IsSimulated { get; set; }
		public InputGroupBaseDto Inputs { get; set; }
		public ICollection<string> Tags {get; set;} = [];
		public int NumReplicates { get; set; }
		public ICollection<ImageToShowDto> Images { get; set; } = [];
	}

	public class ScaffoldGroupSummaryDto : ScaffoldGroupBaseDto
	{
	}

	public class ScaffoldGroupDetailedDto : ScaffoldGroupBaseDto
	{
		public string? Comments { get; set; }

		public List<ScaffoldBaseDto> Scaffolds { get; set; } = [];
		
	}
}