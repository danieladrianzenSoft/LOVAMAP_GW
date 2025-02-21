namespace Infrastructure.DTOs
{
	public class ScaffoldGroupBaseDto
	{
		public int Id { get; set; }
		public string? Name { get; set; }
		public string? Comments { get; set; }
		public string? UploaderId { get; set; }
		public bool IsPublic { get; set; } = false;	
		public DateTime CreatedAt { get; set; }
		public bool IsSimulated { get; set; }
		public InputGroupBaseDto? Inputs { get; set; }
		public IEnumerable<string> Tags { get; set; } = [];
		public int NumReplicates { get; set; }
		public IEnumerable<ImageToShowDto> Images { get; set; } = [];
	}

	public class ScaffoldGroupSummaryDto : ScaffoldGroupBaseDto
	{
	}

	public class ScaffoldGroupDetailedDto : ScaffoldGroupBaseDto
	{
		public List<ScaffoldBaseDto> Scaffolds { get; set; } = [];
		
	}
}