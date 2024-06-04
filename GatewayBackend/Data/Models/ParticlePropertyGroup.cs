
using System.Text.Json;

namespace Data.Models
{
	public class ParticlePropertyGroup
	{
		public int Id { get; set; }
		public int InputGroupId { get; set; }
		public InputGroup InputGroup { get; set; } = null!;
		public string Shape { get; set; } = null!;
		public string? Stiffness { get; set; }
		public string? Friction { get; set; }	
		public string Dispersity { get; set; } = null!;
		public string? SizeDistributionType { get; set; }
		public double MeanSize { get; set; } 
		public double? StandardDeviationSize { get; set; }
		public double Proportion { get; set; } = 1;
		public JsonDocument? SizeDistribution { get; set; } 
	}
}
