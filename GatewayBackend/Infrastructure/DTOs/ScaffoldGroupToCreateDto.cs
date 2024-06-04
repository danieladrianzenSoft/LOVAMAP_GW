
namespace Infrastructure.DTOs
{
	public class ScaffoldGroupToCreateDto
	{
		public string Name { get; set; }
		public string? UploaderId { get; set; }	
		public bool IsSimulated { get; set; }
		public string Comments { get; set; }
		public InputGroupToCreateDto InputGroup { get; set; }
		public virtual ICollection<ScaffoldToCreateDto> Scaffolds { get; set; }

	}
}
