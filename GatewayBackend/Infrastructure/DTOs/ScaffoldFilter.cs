using Microsoft.AspNetCore.Mvc;

namespace Infrastructure.DTOs
{
	public class ScaffoldFilter
	{
		[FromQuery(Name = "userId")]
		public string? UserId { get; set; }

		[FromQuery(Name = "particleSizes")]
    	public ICollection<int>? ParticleSizes { get; set; }
		
		[FromQuery(Name = "tagIds")]
		public ICollection<int>? TagIds { get; set; }

		// [FromQuery(Name = "tags")]
    	// public ICollection<string>? Tags { get; set; }

		[FromQuery(Name = "scaffoldGroupIds")]
		public ICollection<int>? ScaffoldGroupIds { get; set; }

		[FromQuery(Name = "descriptorIds")]
		public ICollection<int>? DescriptorIds { get; set; }

		[FromQuery(Name = "numReplicatesByGroup")]
		public Dictionary<int, int>? NumReplicatesByGroup { get; set; }
		
		// [FromQuery(Name = "descriptors")]
    	// public ICollection<string>? Descriptors { get; set; }

	}
}