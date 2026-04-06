using Data.Models;

public static class CategoryMapper
{
	/// <summary>
	/// Maps an ImageCategory to the single DomainCategory needed to fetch its mesh.
	/// For composite categories (HalfHalf) this returns the "primary" domain (Pores)
	/// — use <see cref="RequiresBothDomains"/> to check if both are needed.
	/// </summary>
	public static DomainCategory? ToDomainCategory(ImageCategory category)
	{
		return category switch
		{
			ImageCategory.Particles => DomainCategory.Particles,
			ImageCategory.ExteriorPores => DomainCategory.Pores,
			ImageCategory.InteriorPores => DomainCategory.Pores,
			ImageCategory.HalfHalf => DomainCategory.Pores, // primary; also needs Particles
			_ => null
		};
	}

	/// <summary>
	/// Returns true when the image category requires both particle and pore domains.
	/// </summary>
	public static bool RequiresBothDomains(ImageCategory category)
		=> category == ImageCategory.HalfHalf;
}