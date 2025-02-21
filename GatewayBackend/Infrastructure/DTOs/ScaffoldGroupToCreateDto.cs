
namespace Infrastructure.DTOs
{
	public class ScaffoldGroupToCreateDto
	{
		// public string Name { get; set; }
		// public string Comments { get; set; }
		public string? UploaderId { get; set; }	
		public bool IsSimulated { get; set; }
		public InputGroupToCreateDto InputGroup { get; set; } = new InputGroupToCreateDto();
		public virtual ICollection<ScaffoldToCreateDto> Scaffolds { get; set; } = [];

	}
}
