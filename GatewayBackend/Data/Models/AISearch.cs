
namespace Data.Models
{
    public class AISearch
	{
		public Guid Id { get; set; } = Guid.NewGuid();
		public AISearchCategory Category { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public string SearchText { get; set; } = string.Empty;
		public string Prompt { get; set; } = string.Empty;
		public string Model { get; set; } = string.Empty;
		public string? AIModelOutput { get; set;} = string.Empty;
		public string? Result { get; set;}
		public DateTime? ResultAt { get; set; }
	}

	public enum AISearchCategory 
	{
		ScaffoldGroup
	}
}