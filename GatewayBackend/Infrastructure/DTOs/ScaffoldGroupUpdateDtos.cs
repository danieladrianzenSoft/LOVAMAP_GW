namespace Infrastructure.DTOs
{
	public class MoveScaffoldToGroupDto
	{
		public int TargetScaffoldGroupId { get; set; }
	}

	public class ScaffoldGroupVisibilityUpdateDto
	{
		public bool IsPublic { get; set; }
	}
}
