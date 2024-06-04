
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class OtherDescriptorToCreateDto
	{
		public string Name { get; set; }
		public JsonDocument Values { get; set; }

	}
}
