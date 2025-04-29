
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class PoreDescriptorToCreateDto
	{
		public required string Name { get; set; }
		public JsonDocument? Values { get; set; }

	}
}
