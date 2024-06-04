
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data.Models;
using Infrastructure.DTOs;
using Microsoft.AspNetCore.Identity;

namespace Infrastructure.Helpers
{	public interface IJwtGeneratorHelper
	{
        Task<string> GenerateJwtToken(User user);
	}
}


