using System.Threading.Tasks;

namespace Infrastructure.IHelpers
{
	public interface IDatabaseMaintenanceHelper
	{
		Task FixIdentitySequencesAsync();
	}
}
