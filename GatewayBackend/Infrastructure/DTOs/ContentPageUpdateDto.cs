namespace Infrastructure.DTOs
{
	public class ContentPageToCreateDto
	{
		public string Slug { get; set; } = null!;
		public string Title { get; set; } = null!;
		public string Area { get; set; } = null!;
		public string? Description { get; set; }
		public bool ComingSoon { get; set; }
		public int SortOrder { get; set; }
		public List<ContentSectionToCreateDto> Sections { get; set; } = [];
	}

	public class ContentSectionToCreateDto
	{
		public string? Title { get; set; }
		public string Body { get; set; } = "";
		public int SortOrder { get; set; }
	}

	public class ContentPageToUpdateDto
	{
		public string? Title { get; set; }
		public string? Description { get; set; }
		public bool? ComingSoon { get; set; }
		public int? SortOrder { get; set; }
	}

	public class ContentSectionToUpdateDto
	{
		public string? Title { get; set; }
		public string? Body { get; set; }
		public int? SortOrder { get; set; }
	}

	public class ReorderSectionsDto
	{
		public List<int> SectionIds { get; set; } = [];
	}
}
