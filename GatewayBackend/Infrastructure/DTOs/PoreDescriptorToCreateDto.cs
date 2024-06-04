
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class PoreDescriptorToCreateDto
	{
		public string Name { get; set; }
		public JsonDocument Values { get; set; }

	}
}
