
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Data.Models;
using Infrastructure.IHelpers;

namespace Infrastructure.Helpers
{	
	public class JwtGeneratorHelper : IJwtGeneratorHelper
	{
		private readonly IConfiguration _config;
		private readonly UserManager<User> _userManager;
		private readonly SymmetricSecurityKey _key;


		public JwtGeneratorHelper(IConfiguration config, UserManager<User> userManager)
		{
			_config = config;
			_userManager = userManager;
			var jwtKey = _config["Jwt:Key"] ?? throw new ArgumentNullException("Jwt:Key", "JWT Key is not configured in app settings");
       		_key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
		}

		public async Task<string> GenerateJwtToken(User user)
		{
			var claims = new List<Claim>
			{
				new Claim(ClaimTypes.NameIdentifier, user.Id)
			};

			if (!string.IsNullOrEmpty(user.Email))
			{
				claims.Add(new Claim(ClaimTypes.Email, user.Email));
			}

            var roles = await _userManager.GetRolesAsync(user);

			roles.ToList().ForEach(role => claims.Add(new Claim(ClaimTypes.Role, role)));

            var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha512Signature);
            //HmacSha512Signature is the largest level of encryption.

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(60), 
                SigningCredentials = creds,
                Issuer = _config["Jwt:Issuer"],
				Audience = _config["Jwt:Issuer"]
            };

            var tokenHandler = new JwtSecurityTokenHandler();

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
		}
	}
}


