
using Infrastructure.Helpers;
using System.Text.Json.Serialization;

namespace Infrastructure.DTOs
{
	public class ScaffoldGroupToCreateDto
	{
		// public string Name { get; set; }
		// public string Comments { get; set; }
		public string? OriginalFileName { get; set; }
		public string? UploaderId { get; set; }	
		[JsonConverter(typeof(FlexibleBoolConverter))]
		public bool IsSimulated { get; set; }
		public InputGroupToCreateDto InputGroup { get; set; } = new InputGroupToCreateDto();
		public virtual ICollection<ScaffoldToCreateDto> Scaffolds { get; set; } = [];

	}
}
