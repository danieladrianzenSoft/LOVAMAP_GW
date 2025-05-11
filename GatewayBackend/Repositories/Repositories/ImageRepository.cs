using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Repositories.IRepositories;
using Data;
using Data.Models;
using Microsoft.EntityFrameworkCore;
using Infrastructure.DTOs;

namespace Repositories.Repositories
{
	public class ImageRepository : IImageRepository
	{
		private readonly DataContext _context;

		public ImageRepository(DataContext context)
		{
			_context = context;
		}

		public bool HasChanges()
		{
			return _context.ChangeTracker.HasChanges();
		}
		public void Add(Image image)
		{
			_context.Images.Add(image);
		}

		public async Task<Image?> Get(int imageId)
		{
			return await _context.Images.Where(x => x.Id == imageId).FirstOrDefaultAsync();
		}

		public async Task<ICollection<Image>> GetAll(int scaffoldGroupId)
		{
			return await _context.Images
				.Where(x => x.ScaffoldGroupId == scaffoldGroupId)
				.OrderByDescending(x => x.IsThumbnail)
				.ToListAsync();
		}

		// public async Task<List<int>> GetAllImageIds()
		// {
		// 	return await _context.Images.Select(i => i.Id).ToListAsync();
		// }
		public async Task<List<int>> GetImageIdsForDeletion(ImageCategory? category = null, bool includeThumbnails = false)
		{
			var query = _context.Images.AsQueryable();

			if (category.HasValue)
			{
				query = query.Where(i => i.Category == category.Value);
			}

			if (!includeThumbnails)
			{
				query = query.Where(i => !i.IsThumbnail);
			}

			return await query.Select(i => i.Id).ToListAsync();
		}

		public async Task<Dictionary<int, IEnumerable<ImageToShowDto>>> GetAllImagesForScaffoldGroups(IEnumerable<int> scaffoldGroupIds)
		{
			var images = await _context.Images
				.Where(img => scaffoldGroupIds.Contains(img.ScaffoldGroupId))
				.OrderByDescending(img => img.IsThumbnail)
				.GroupBy(img => img.ScaffoldGroupId)
				.ToDictionaryAsync(g => g.Key, g => g.Select(img => new ImageToShowDto
				{
					Id = img.Id,
					Url = img.Url,
					PublicId = img.PublicId,
					IsThumbnail = img.IsThumbnail,
					Category = img.Category.ToString()
				}).ToList() as IEnumerable<ImageToShowDto>);

			return images;
		}

		public async Task<bool> HasThumbnailInCategory(int scaffoldGroupId, ImageCategory category)
		{
			return await _context.Images.AnyAsync(img =>
				img.ScaffoldGroupId == scaffoldGroupId &&
				img.IsThumbnail &&
				img.Category == category);
		}

		public async Task<int> GetNumThumbnails(int scaffoldGroupId)
		{
			return await _context.Images
				.Where(x => x.ScaffoldGroupId == scaffoldGroupId && x.IsThumbnail)
				.CountAsync();
		}

		public async Task<ICollection<Image>> GetThumbnails(int scaffoldGroupId)
		{
			var images = await _context.Images
				.Where(x => x.ScaffoldGroupId == scaffoldGroupId && x.IsThumbnail)
				.Take(3)
				.ToListAsync();

			return images;
		}

		public async Task<Dictionary<int, IEnumerable<ImageToShowDto>>> GetThumbnailsForScaffoldGroups(IEnumerable<int> scaffoldGroupIds)
		{
			var images = await _context.Images
				.Where(img => scaffoldGroupIds.Contains(img.ScaffoldGroupId) && img.IsThumbnail)
				.GroupBy(img => img.ScaffoldGroupId)
				.ToDictionaryAsync(g => g.Key, g => g.Select(img => new ImageToShowDto
				{
					Id = img.Id,
					Url = img.Url,
					PublicId = img.PublicId,
					IsThumbnail = img.IsThumbnail,
					Category = img.Category.ToString()
				}).ToList() as IEnumerable<ImageToShowDto>);

			return images;
		}

		public async Task<Image?> UpdateImage(ImageToUpdateDto imageToUpdate)
		{
			var image = await _context.Images.Where(image => image.Id == imageToUpdate.Id).FirstOrDefaultAsync();

			if (image == null) return null;

			if (Enum.TryParse<ImageCategory>(imageToUpdate.Category, out var category))
			{
				image.Category = category;
			}
			else
			{
				throw new ArgumentException($"Invalid category: {imageToUpdate.Category}");
			}

			image.IsThumbnail = imageToUpdate.IsThumbnail;

			return image;
		}

		public async Task<bool> Delete(int imageToDeleteId)
		{
			var image = await _context.Images.Where(image => image.Id == imageToDeleteId).FirstOrDefaultAsync();

			if (image == null) return false;

			_context.Remove(image);

			return true;
		}

		public async Task ClearOtherThumbnails(int scaffoldGroupId, ImageCategory category, int? excludeImageId = null)
		{
			var existingThumbnails = await _context.Images
				.Where(img => img.ScaffoldGroupId == scaffoldGroupId &&
							img.Category == category &&
							img.IsThumbnail &&
							(!excludeImageId.HasValue || img.Id != excludeImageId.Value))
				.ToListAsync();

			foreach (var img in existingThumbnails)
			{
				img.IsThumbnail = false;
			}
		}

	}
}
