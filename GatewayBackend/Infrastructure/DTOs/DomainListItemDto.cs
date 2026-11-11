namespace Infrastructure.DTOs
{
	public class DomainListItemDto
	{
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public int ScaffoldGroupId { get; set; }
		public string Category { get; set; } = string.Empty;
		public string? OriginalFileName { get; set; }
		public bool HasMesh { get; set; }
		public bool HasMetadata { get; set; }
		public DateTime CreatedAt { get; set; }
	}

	public class DomainLookupItemDto
	{
		public int Id { get; set; }
		public int ScaffoldId { get; set; }
		public string Category { get; set; } = string.Empty;
		public string OriginalFileName { get; set; } = string.Empty;
		public bool HasMetadata { get; set; }
	}
}
