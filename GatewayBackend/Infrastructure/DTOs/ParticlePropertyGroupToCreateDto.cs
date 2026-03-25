
using Infrastructure.Helpers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Infrastructure.DTOs
{
	public class ParticlePropertyGroupToCreateDto
	{
		public string? Shape { get; set; }
		public string? Stiffness { get; set; }
		public string? Friction { get; set; }
		public string? Dispersity { get; set; }	
		public string? SizeDistributionType { get; set; }
		[JsonConverter(typeof(PlaceholderTolerantDoubleConverter))]
		public double MeanSize { get; set; } 
		public double MedianSize { get; set; } 
		public double MaxSize { get; set; } 
		public double MinSize { get; set; } 
		[JsonConverter(typeof(PlaceholderTolerantDoubleConverter))]
		public double StandardDeviationSize { get; set; }
		public double Proportion { get; set; } = 1;

	}
}
