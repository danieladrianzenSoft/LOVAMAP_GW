namespace Data.Models
{
	public class TagForFilterDto
	{
		public int Id { get; set; }
		public string Name { get; set; } = null!;
		public string? ReferenceProperty { get; set; }
	
	}
}