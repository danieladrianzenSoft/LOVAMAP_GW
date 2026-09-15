namespace Infrastructure.DTOs
{
	public class ContentPageSummaryDto
	{
		public int Id { get; set; }
		public string Slug { get; set; } = null!;
		public string Title { get; set; } = null!;
		public string Area { get; set; } = null!;
		public string? Description { get; set; }
		public bool ComingSoon { get; set; }
		public int SortOrder { get; set; }
	}

	public class ContentSectionDto
	{
		public int Id { get; set; }
		public string? Title { get; set; }
		public string Body { get; set; } = "";
		public int SortOrder { get; set; }
	}

	public class ContentPageDetailDto
	{
		public int Id { get; set; }
		public string Slug { get; set; } = null!;
		public string Title { get; set; } = null!;
		public string Area { get; set; } = null!;
		public string? Description { get; set; }
		public bool ComingSoon { get; set; }
		public int SortOrder { get; set; }
		public List<ContentSectionDto> Sections { get; set; } = [];
	}
}
