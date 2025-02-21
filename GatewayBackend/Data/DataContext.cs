using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System.Text.Json;
using Data.Models;

namespace Data;

public partial class DataContext : IdentityDbContext<User, Role, string>
{
	public DataContext(DbContextOptions<DataContext> options) : base(options) {}
	public override DbSet<User> Users { get; set; }
	public DbSet<ScaffoldGroup> ScaffoldGroups { get; set; }
    public DbSet<Scaffold> Scaffolds { get; set; }
	public DbSet<Publication> Publications { get; set; }
	public DbSet<InputGroup> InputGroups { get; set; }
    public DbSet<ParticlePropertyGroup> ParticlePropertyGroups { get; set; }
    public DbSet<DescriptorType> DescriptorTypes { get; set; }
    public DbSet<GlobalDescriptor> GlobalDescriptors { get; set; }
    public DbSet<PoreDescriptor> PoreDescriptors { get; set; }
    public DbSet<OtherDescriptor> OtherDescriptors { get; set; }
	public DbSet<Tag> Tags { get; set; }
    public DbSet<Download> Downloads { get; set; }
    public DbSet<Image> Images { get; set; }
	public DbSet<DescriptorTypeDownload> DescriptorTypeDownloads { get; set; }
	public DbSet<ScaffoldDownload> ScaffoldDownloads { get; set; }
	public DbSet<ScaffoldTag> ScaffoldTags { get; set; }

	protected override void OnModelCreating(ModelBuilder builder)
	{
		base.OnModelCreating(builder);

		// Customize table names for Identity entities
		builder.Entity<User>().ToTable("Users");
		builder.Entity<Role>().ToTable("Roles");
		builder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
		builder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
		builder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
		builder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");
		builder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");

		// User to ScaffoldGroups relationship
        builder.Entity<User>()
            .HasMany(u => u.ScaffoldGroups)
            .WithOne(g => g.Uploader)
            .HasForeignKey(g => g.UploaderId)
			.OnDelete(DeleteBehavior.SetNull);

        // Experiment to User relationship
        builder.Entity<ScaffoldGroup>()
            .HasOne(g => g.Uploader) // Each Experiment has one Uploader
            .WithMany(u => u.ScaffoldGroups) // A User has many Experiments
            .HasForeignKey(g => g.UploaderId) // ForeignKey in Experiment pointing to User
            .OnDelete(DeleteBehavior.SetNull); // Set ForeignKey to null on User deletion

        // User to Downloads relationship
        builder.Entity<User>()
            .HasMany(u => u.Downloads)
            .WithOne(d => d.Downloader)
            .HasForeignKey(d => d.DownloaderId)
			.OnDelete(DeleteBehavior.Cascade); 

		// Experiment to Scaffold relationship
        builder.Entity<ScaffoldGroup>()
            .HasMany(g => g.Scaffolds)
            .WithOne(s => s.ScaffoldGroup)
            .HasForeignKey(s => s.ScaffoldGroupId)
			.OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Scaffold>()
            .HasOne(s => s.ScaffoldGroup)
            .WithMany(g => g.Scaffolds)
            .HasForeignKey(s => s.ScaffoldGroupId)
            .OnDelete(DeleteBehavior.Cascade);

		// Configure Publication to Experiment relationship
        builder.Entity<Publication>()
            .HasMany(p => p.ScaffoldGroups)
            .WithOne(g => g.Publication)
            .HasForeignKey(g => g.PublicationId)
            .OnDelete(DeleteBehavior.SetNull);  // Set to null if the Publication is deleted
        
        builder.Entity<Publication>()
            .HasMany(p => p.DescriptorTypes)
            .WithOne(d => d.Publication)
            .HasForeignKey(p => p.PublicationId)
            .OnDelete(DeleteBehavior.SetNull);
		
		// One-to-One relationship between ScaffoldGroup and InputGroup          
        builder.Entity<ScaffoldGroup>()
            .HasOne(g => g.InputGroup)
            .WithOne(i => i.ScaffoldGroup)
            .HasForeignKey<InputGroup>(i => i.ScaffoldGroupId)
			.OnDelete(DeleteBehavior.Cascade);
        
        // One-to-Many relationship between ScaffoldGroup and Images
        builder.Entity<ScaffoldGroup>()
            .HasMany(s => s.Images)
            .WithOne(i => i.ScaffoldGroup)
            .HasForeignKey( s => s.ScaffoldGroupId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.Entity<Image>()
            .HasOne(i => i.ScaffoldGroup)
            .WithMany(s => s.Images)
            .HasForeignKey(i => i.ScaffoldGroupId)
			.OnDelete(DeleteBehavior.SetNull);

        // One-to-Many relationship between Scaffold and Images
        builder.Entity<Scaffold>()
            .HasMany(s => s.Images)
            .WithOne(i => i.Scaffold)
            .HasForeignKey( s => s.ScaffoldId)
            .OnDelete(DeleteBehavior.SetNull);
            
        builder.Entity<Image>()
            .HasOne(i => i.Scaffold)
            .WithMany(s => s.Images)
            .HasForeignKey(i => i.ScaffoldId)
			.OnDelete(DeleteBehavior.SetNull);

        // One-to-Many relationship between Image and User (uploader)
        builder.Entity<User>()
            .HasMany(u => u.UploadedImages)
            .WithOne(i => i.Uploader)
            .HasForeignKey(i => i.UploaderId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.Entity<Image>()
            .HasOne(i => i.Uploader)
            .WithMany(u => u.UploadedImages)
            .HasForeignKey(i => i.UploaderId)
			.OnDelete(DeleteBehavior.SetNull);

        // One-to-Many relationship between InputGroup and ParticlePropertyGroup
        builder.Entity<InputGroup>()
            .HasMany(i => i.ParticlePropertyGroups)
            .WithOne(p => p.InputGroup)
            .HasForeignKey(p => p.InputGroupId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<InputGroup>()
            .Property(p => p.SizeDistribution)
            .HasColumnType("jsonb"); 
        
        builder.Entity<ParticlePropertyGroup>()
            .HasOne(p => p.InputGroup)
            .WithMany(i => i.ParticlePropertyGroups)
            .HasForeignKey(p => p.InputGroupId)
            .OnDelete(DeleteBehavior.SetNull);

        // DescriptorType relationships
        builder.Entity<DescriptorType>()
            .HasMany(d => d.GlobalDescriptors)
            .WithOne(g => g.DescriptorType)
            .HasForeignKey(g => g.DescriptorTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<DescriptorType>()
            .HasOne(d => d.Publication)
            .WithMany(p => p.DescriptorTypes)
            .HasForeignKey(g => g.PublicationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<DescriptorType>()
            .HasMany(d => d.PoreDescriptors)
            .WithOne(p => p.DescriptorType)
            .HasForeignKey(p => p.DescriptorTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<DescriptorType>()
            .HasMany(d => d.OtherDescriptors)
            .WithOne(o => o.DescriptorType)
            .HasForeignKey(o => o.DescriptorTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PoreDescriptor>()
            .Property(p => p.Values)
            .HasColumnType("jsonb"); 

		builder.Entity<OtherDescriptor>()
            .Property(p => p.Values)
            .HasColumnType("jsonb"); 

		// Many-to-Many: Scaffold to Tags
        builder.Entity<ScaffoldTag>()
            .HasKey(st => new { st.ScaffoldId, st.TagId });
        builder.Entity<ScaffoldTag>()
            .HasOne(st => st.Scaffold)
            .WithMany(s => s.ScaffoldTags)
            .HasForeignKey(st => st.ScaffoldId);
        builder.Entity<ScaffoldTag>()
            .HasOne(st => st.Tag)
            .WithMany(t => t.ScaffoldTags)
            .HasForeignKey(st => st.TagId);

		// Many-to-Many: Scaffold to Downloads
        builder.Entity<ScaffoldDownload>()
            .HasKey(sd => new { sd.ScaffoldId, sd.DownloadId });
        builder.Entity<ScaffoldDownload>()
            .HasOne(sd => sd.Scaffold)
            .WithMany(s => s.ScaffoldDownloads)
            .HasForeignKey(sd => sd.ScaffoldId);
        builder.Entity<ScaffoldDownload>()
            .HasOne(sd => sd.Download)
            .WithMany(d => d.ScaffoldDownloads)
            .HasForeignKey(sd => sd.DownloadId);

		// Configuring many-to-many relationships for DescriptorType and Download
        builder.Entity<DescriptorTypeDownload>()
            .HasKey(dtd => new { dtd.DescriptorTypeId, dtd.DownloadId });
        builder.Entity<DescriptorTypeDownload>()
            .HasOne(dtd => dtd.DescriptorType)
            .WithMany(dt => dt.DescriptorTypeDownloads)
            .HasForeignKey(dtd => dtd.DescriptorTypeId);
        builder.Entity<DescriptorTypeDownload>()
            .HasOne(dtd => dtd.Download)
            .WithMany(d => d.DescriptorTypeDownloads)
            .HasForeignKey(dtd => dtd.DownloadId);

	}
}
