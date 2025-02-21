using System.Collections.Generic;
using System.Threading.Tasks;
using Infrastructure.DTOs;
using Data.Models;

namespace Services.IServices
{
	public interface IImageService
	{
		Task<(bool Succeeded, string ErrorMessage, ImageToShowDto? CreatedImage)> UploadImage(ImageForCreationDto imageToCreate, string uploaderId);
		Task<ICollection<Image>> GetAllImagesForScaffoldGroup(int scaffoldGroupId);
		Task<Dictionary<int, IEnumerable<ImageToShowDto>>> GetAllImagesForScaffoldGroups(IEnumerable<int> scaffoldGroupIds);
		Task<ICollection<Image>> GetThumbnails(int scaffoldGroupId);
		Task<Dictionary<int, IEnumerable<ImageToShowDto>>> GetThumbnailsForScaffoldGroups(IEnumerable<int> scaffoldGroupIds);
		Task<Image?> UpdateImage(ImageToUpdateDto imageToUpdate, ScaffoldGroup scaffoldGroup);
		Task<(bool Succeeded, string ErrorMessage)> DeleteImage(int imageId, string userId);

	}
}