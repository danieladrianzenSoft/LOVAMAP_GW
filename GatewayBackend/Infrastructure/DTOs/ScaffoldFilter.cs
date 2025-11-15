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

		[FromQuery(Name = "tagsNames")]
    	public ICollection<string>? TagNames { get; set; }

		[FromQuery(Name = "scaffoldGroupIds")]
		public ICollection<int>? ScaffoldGroupIds { get; set; }

		[FromQuery(Name = "descriptorIds")]
		public ICollection<int>? DescriptorIds { get; set; }

		[FromQuery(Name = "numReplicatesByGroup")]
		public Dictionary<int, int>? NumReplicatesByGroup { get; set; }

		[FromQuery(Name = "publicationId")]
		public int? PublicationId { get; set; }          // show ALL scaffolds used by any dataset in this publication

		[FromQuery(Name = "publicationDatasetId")]
		public int? PublicationDatasetId { get; set; }   // show ONLY scaffolds in this dataset
		
		[FromQuery(Name = "restrictToPublicationDataset")]
		public bool RestrictToPublicationDataset { get; set; } = false; // guardrail
		

	}
}