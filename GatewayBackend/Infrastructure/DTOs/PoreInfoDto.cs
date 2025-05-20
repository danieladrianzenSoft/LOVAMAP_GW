
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class PoreInfoDto
	{
		public int ScaffoldGroupId { get; set; }
		public int ScaffoldId { get; set; }
		public JsonDocument? PoreVolume { get; set; }
		public JsonDocument? PoreSurfaceArea { get; set; }
		public JsonDocument? PoreAspectRatio { get; set; }
		public JsonDocument? PoreLongestLength { get; set; }
	}
}
