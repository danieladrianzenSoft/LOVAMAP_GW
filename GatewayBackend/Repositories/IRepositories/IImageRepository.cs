using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;

namespace Repositories.IRepositories
{
    public interface IImageRepository
    {
		bool HasChanges();
		void Add(Image image);
		Task<bool> Delete(int imageToDeleteId);
		Task<Image?> Get(int imageId);
		Task<ICollection<Image>> GetAll(int scaffoldGroupId);
		Task<int> GetNumThumbnails(int scaffoldGroupId);
		Task<ICollection<Image>> GetThumbnails(int scaffoldGroupId);


	}
}