
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class PoreInfoScaffoldDto
	{
		public int ScaffoldId { get; set; }
		public List<double>? PoreVolume { get; set; }
		public List<double>? PoreSurfaceArea { get; set; }
		public List<double>? PoreLongestLength { get; set; }
		public List<double>? PoreAspectRatio { get; set; }
	}
}