namespace Infrastructure
{
    public interface IUserContextHelper
    {
        string? GetCurrentUserId();
        List<string> GetCurrentUserRoles();
    }
}