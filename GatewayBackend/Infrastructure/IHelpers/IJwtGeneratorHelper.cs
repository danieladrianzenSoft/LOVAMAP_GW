
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.AspNetCore.Identity;

namespace Infrastructure.IHelpers
{	public interface IJwtGeneratorHelper
	{
		Task<string> GenerateJwtToken(User user);
		string GenerateUploadJwt(string jobId, string? userId = null, int expiryMinutes = 30);
	}
}


