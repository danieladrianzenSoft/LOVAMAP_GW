using System.Linq;
using System.Security.Claims;

using Microsoft.AspNetCore.Http;

namespace Infrastructure
{
    public class UserContextHelper : IUserContextHelper
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        public UserContextHelper(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;

        }
        public string? GetCurrentUserId()
        {
            return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
        public List<string> GetCurrentUserRoles()
        {
            var claimsIdentity = _httpContextAccessor.HttpContext?.User.Identity as ClaimsIdentity;
            
            if (claimsIdentity == null)
                return [];

            // Extract roles from the claims
            var roleClaims = claimsIdentity.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToList();
            return roleClaims;
        }

    }
}