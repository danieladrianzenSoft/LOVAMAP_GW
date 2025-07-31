
namespace Data.Models
{
	public class ScaffoldGroupPublication
	{
		public int ScaffoldGroupId { get; set; }
		public ScaffoldGroup ScaffoldGroup { get; set; } = null!;
		public int PublicationId { get; set; }
		public Publication Publication { get; set; } = null!;
	}
}