
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class ParticlePropertyGroupToCreateDto
	{
		public string? Shape { get; set; }
		public string? Stiffness { get; set; }
		public string? Friction { get; set; }
		public string? Dispersity { get; set; }	
		public string? SizeDistributionType { get; set; }
		public double MeanSize { get; set; } 
		public double MedianSize { get; set; } 
		public double MaxSize { get; set; } 
		public double MinSize { get; set; } 
		public double StandardDeviationSize { get; set; }
		public double Proportion { get; set; } = 1;

	}
}
