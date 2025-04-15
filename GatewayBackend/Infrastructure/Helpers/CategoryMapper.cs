using Data.Models;

public static class CategoryMapper
{
	public static DomainCategory? ToDomainCategory(ImageCategory category)
	{
		return category switch
		{
			ImageCategory.Particles => DomainCategory.Particles,
			ImageCategory.ExteriorPores => DomainCategory.ExteriorPores,
			ImageCategory.InteriorPores => DomainCategory.InteriorPores,
			_ => null
		};
	}
}