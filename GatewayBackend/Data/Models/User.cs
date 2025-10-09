using Microsoft.AspNetCore.Identity;

namespace Data.Models
{
	public class User : IdentityUser
	{
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public ICollection<ScaffoldGroup> ScaffoldGroups { get; set; } = [];
		public virtual ICollection<Download> Downloads { get; set; } = [];
		public virtual ICollection<Image> UploadedImages { get; set; } = [];
		public virtual ICollection<Job> JobsCreated { get; set; } = [];


	}
}