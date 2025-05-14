
using System.ComponentModel.DataAnnotations;
using Data.Models;
using Microsoft.AspNetCore.Http;

namespace Infrastructure.DTOs
{
	public class ScaffoldGroupsToResetDto
    {
		public List<int> ScaffoldGroupIds { get; set; } = [];
	}
}