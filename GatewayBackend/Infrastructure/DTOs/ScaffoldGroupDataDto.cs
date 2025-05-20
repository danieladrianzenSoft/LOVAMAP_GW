namespace Infrastructure.DTOs
{
	public class ScaffoldGroupDataDto
	{
		public int ScaffoldGroupId { get; set; }
		public ScaffoldGroupBaseDto ScaffoldGroup { get; set; } = null!;
		public List<PoreInfoScaffoldDto> PoreDescriptors { get; set; } = [];
	}
}