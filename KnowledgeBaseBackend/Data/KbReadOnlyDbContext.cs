using KnowledgeBaseApi.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KnowledgeBaseApi.Data
{
	public class KbReadOnlyDbContext : DbContext
	{
		public KbReadOnlyDbContext(DbContextOptions<KbReadOnlyDbContext> options) : base(options) { }

		public DbSet<Scaffold> Scaffolds => Set<Scaffold>();
		public DbSet<ScaffoldGroup> ScaffoldGroups => Set<ScaffoldGroup>();
		public DbSet<Publication> Publications => Set<Publication>();
		public DbSet<GlobalDescriptor> GlobalDescriptors => Set<GlobalDescriptor>();

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			base.OnModelCreating(modelBuilder);

			modelBuilder.Entity<Scaffold>(entity =>
			{
				entity.ToTable("Scaffolds");
				entity.HasKey(e => e.Id);
				entity.HasOne(e => e.ScaffoldGroup)
					.WithMany(g => g.Scaffolds)
					.HasForeignKey(e => e.ScaffoldGroupId);
			});

			modelBuilder.Entity<ScaffoldGroup>(entity =>
			{
				entity.ToTable("ScaffoldGroups");
				entity.HasKey(e => e.Id);
			});

			modelBuilder.Entity<Publication>(entity =>
			{
				entity.ToTable("Publications");
				entity.HasKey(e => e.Id);
			});

			modelBuilder.Entity<GlobalDescriptor>(entity =>
			{
				entity.ToTable("GlobalDescriptors");
				entity.HasKey(e => e.Id);
				entity.HasOne(e => e.Scaffold)
					.WithMany(s => s.GlobalDescriptors)
					.HasForeignKey(e => e.ScaffoldId);
			});
		}
	}
}
