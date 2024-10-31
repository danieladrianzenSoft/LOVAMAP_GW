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

	}
}
