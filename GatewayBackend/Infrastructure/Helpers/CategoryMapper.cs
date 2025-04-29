using Data.Models;

public static class CategoryMapper
{
	public static DomainCategory? ToDomainCategory(ImageCategory category)
	{
		return category switch
		{
			ImageCategory.Particles => DomainCategory.Particles,
			ImageCategory.ExteriorPores => DomainCategory.Pores,
			ImageCategory.InteriorPores => DomainCategory.Pores,
			_ => null
		};
	}
}