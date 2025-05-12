using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Data;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Repositories.IRepositories;
using Services.IServices;

namespace Services.Services
{	public class ImageService : IImageService
	{
		private readonly DataContext _context;
		private readonly IModelMapper _modelMapper;
		private readonly IImageRepository _imageRepository;
		private readonly IOptions<CloudinarySettings> _cloudinaryConfig;
		private readonly ILogger<ImageService> _logger;
		private Cloudinary _cloudinary;

		public ImageService(DataContext context, IOptions<CloudinarySettings> cloudinaryConfig, 
			IImageRepository imageRepository,
			ILogger<ImageService> logger, IModelMapper modelMapper)
		{
			_context = context;
			_modelMapper = modelMapper;
			_imageRepository = imageRepository;
			_cloudinaryConfig = cloudinaryConfig;
			_logger = logger;

			Account acc = new Account(
                _cloudinaryConfig.Value.CloudName,
                _cloudinaryConfig.Value.ApiKey,
                _cloudinaryConfig.Value.ApiSecret
            );

            _cloudinary = new Cloudinary(acc);
		}

		public async Task<(bool Succeeded, string ErrorMessage, ImageToShowDto? CreatedImage)> UploadImage(ImageForCreationDto imageToCreate, string uploaderId)
		{
			try
			{
				var file = imageToCreate.File;
				var uploadResult = new ImageUploadResult();

				if (file.Length > 0)
				{
					using (var stream = file.OpenReadStream())
					{
						var uploadParams = new ImageUploadParams()
						{
							File = new FileDescription(file.Name, stream),
							Transformation = new Transformation().
								Width(500).Height(500).Crop("fill").Gravity("center")
						};

						uploadResult = _cloudinary.Upload(uploadParams);
					}
				}
				
				imageToCreate.Url = uploadResult.SecureUrl.ToString();
				imageToCreate.PublicId = uploadResult.PublicId;

				var image = _modelMapper.MapToImage(imageToCreate, uploaderId);
				var parsedCategory = Enum.TryParse<ImageCategory>(imageToCreate.Category, true, out var parsed)
					? parsed
					: ImageCategory.Other;

				image.Category = parsedCategory;

				// bool hasThumbnailInCategory = await _imageRepository.HasThumbnailInCategory(image.ScaffoldGroupId, image.Category);
				// image.IsThumbnail = !hasThumbnailInCategory;
				await _imageRepository.ClearOtherThumbnails(image.ScaffoldGroupId, parsedCategory);
				image.IsThumbnail = true;

				_imageRepository.Add(image);

				await _context.SaveChangesAsync();

				var imageToReturn = _modelMapper.MapImageToDto(image);

				return (true, "", imageToReturn);

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error uploading image");
				return (false, "UnexpectedError", null);
			}
		}

		public async Task<(bool Succeeded, string ErrorMessage)> DeleteImage(int imageId, string userId)
		{
			try
			{
				var image = await _imageRepository.Get(imageId);
				if (image == null) return (false, "Not_Found");
				if (image.UploaderId != userId) return (false, "Unauthorized");

				var (succeeded, errorMessage) = await DeleteImageInternal(image);
				if (!succeeded) return (false, errorMessage);

				await _context.SaveChangesAsync();
				return (true, "");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error deleting image");
				return (false, "Unknown_Error");
			}
		}

		public async Task<(bool Succeeded, BatchOperationResult result)> DeleteImages(IEnumerable<int> imageIds, string userId, bool force = false)
		{
			var result = new BatchOperationResult();

			foreach (var imageId in imageIds)
			{
				try
				{
					var image = await _imageRepository.Get(imageId);
					if (image == null || (!force && image.UploaderId != userId))
					{
						result.FailedIds.Add(imageId);
						continue;
					}

					var (succeeded, _) = await DeleteImageInternal(image);
					if (succeeded)
						result.SucceededIds.Add(imageId);
					else
						result.FailedIds.Add(imageId);
				}
				catch (Exception ex)
				{
					_logger.LogError(ex, $"Error deleting image {imageId}");
					result.FailedIds.Add(imageId);
				}
			}

			try
			{
				await _context.SaveChangesAsync();
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error saving changes after batch delete");
				result.FailedIds.AddRange(result.SucceededIds);
				result.SucceededIds.Clear();
			}

			return (true, result);
		}

		private async Task<(bool Succeeded, string ErrorMessage)> DeleteImageInternal(Image image)
		{
			try
			{
				if (!string.IsNullOrEmpty(image.PublicId))
				{
					var deleteParams = new DeletionParams(image.PublicId);
					var result = _cloudinary.Destroy(deleteParams);

					if (result.Result != "ok")
					{
						_logger.LogInformation($"Cloudinary delete result for image {image.Id}: {result.Result}");
						return (false, "Cloudinary_Delete_Failed");
					}
				}

				await _imageRepository.Delete(image.Id);
				return (true, "");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error deleting image internally");
				return (false, "Unknown_Error");
			}
		}


		public async Task<ICollection<Image>> GetThumbnails(int scaffoldGroupId)
		{
			try
			{
				var images = await _imageRepository.GetThumbnails(scaffoldGroupId);
				return images;
			}
			catch (Exception ex)
			{
				
				_logger.LogError(ex, "Error getting thumbnails");
				return [];
			}
		}

		public async Task<Dictionary<int, IEnumerable<ImageToShowDto>>> GetThumbnailsForScaffoldGroups(IEnumerable<int> scaffoldGroupIds)
		{
			try
			{
				var images = await _imageRepository.GetThumbnailsForScaffoldGroups(scaffoldGroupIds);
				return images;
			}
			catch (Exception ex)
			{
				
				_logger.LogError(ex, "Error getting scaffold group images");
				return [];
			}
		}

		public async Task<ICollection<Image>> GetAllImagesForScaffoldGroup(int scaffoldGroupId)
		{
			try
			{
				var images = await _imageRepository.GetAll(scaffoldGroupId);
				return images;
			}
			catch (Exception ex)
			{
				
				_logger.LogError(ex, "Error getting scaffold group images");
				return [];
			}
		}

		public async Task<Dictionary<int, IEnumerable<ImageToShowDto>>> GetAllImagesForScaffoldGroups(IEnumerable<int> scaffoldGroupIds)
		{
			try
			{
				var images = await _imageRepository.GetAllImagesForScaffoldGroups(scaffoldGroupIds);
				return images;
			}
			catch (Exception ex)
			{
				
				_logger.LogError(ex, "Error getting scaffold group images");
				return [];
			}
		}

		// public async Task<List<int>> GetAllImageIds()
		// {
		// 	try
		// 	{
		// 		return await _imageRepository.GetAllImageIds();
		// 	}
		// 	catch (Exception ex)
		// 	{
		// 		_logger.LogError(ex, "Error retrieving image IDs");
		// 		return [];
		// 	}
		// }
		public async Task<List<int>> GetImageIdsForDeletion(ImageCategory? category = null, bool includeThumbnails = false)
		{
			try
			{
				return await _imageRepository.GetImageIdsForDeletion(category, includeThumbnails);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error retrieving image IDs for deletion");
				return new List<int>();
			}
		}

		public async Task<Image?> UpdateImage(ImageToUpdateDto imageToUpdate, ScaffoldGroup scaffoldGroup)
		{
			var image = await _imageRepository.Get(imageToUpdate.Id);
			if (image == null) return null;

			var newCategory = Enum.Parse<ImageCategory>(imageToUpdate.Category);
			image.Category = newCategory;

			if (imageToUpdate.IsThumbnail)
			{
				// Find existing thumbnail in the same category
				// var existingThumbnail = scaffoldGroup.Images
				// 	.FirstOrDefault(img => img.IsThumbnail && img.Category == newCategory && img.Id != image.Id);

				// if (existingThumbnail != null)
				// {
				// 	existingThumbnail.IsThumbnail = false;
				// }
				await _imageRepository.ClearOtherThumbnails(scaffoldGroup.Id, newCategory, image.Id);
				image.IsThumbnail = true;
			}
			else
			{
				image.IsThumbnail = false;
			}

			await _context.SaveChangesAsync();
			return image;
		}



	}
}