namespace Infrastructure.DTOs
{
	public class DomainFilterParams : PagingParams
	{
		public string? Category { get; set; }
		public bool? HasMetadata { get; set; }
		public bool? HasMesh { get; set; }
		public string? Search { get; set; }
	}
}
