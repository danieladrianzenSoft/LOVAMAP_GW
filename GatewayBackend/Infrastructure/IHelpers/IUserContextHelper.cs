namespace Infrastructure.IHelpers
{
    public interface IUserContextHelper
    {
        string? GetCurrentUserId();
        List<string> GetCurrentUserRoles();
    }
}