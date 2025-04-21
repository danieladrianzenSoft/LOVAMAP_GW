
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class PoreInfoDto
	{
		public int ScaffoldGroupId { get; set; }
		public int ScaffoldId { get; set; }
		public required JsonDocument PoreVolume { get; set; }
		public required JsonDocument PoreAspectRatio { get; set; }

	}
}
