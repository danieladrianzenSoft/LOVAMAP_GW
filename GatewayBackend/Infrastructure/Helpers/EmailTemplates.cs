
using System;
using Infrastructure.IHelpers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Helpers
{	
	public enum EmailTemplate
    {
        Welcome = 0,
        PasswordReset = 1
    }

    public class EmailTemplateDetails
	{
		public required string TemplateId { get; set; }
		public required string Subject { get; set; }
	}

	public static class EmailTemplates
	{
		public static readonly Dictionary<EmailTemplate, EmailTemplateDetails> Map = new()
		{
			{
				EmailTemplate.Welcome,
				new EmailTemplateDetails {
					TemplateId = "pr9084zj6wjgw63d",
					Subject = "LOVAMAP - Welcome! Verify your email"
				}
			},
			{
				EmailTemplate.PasswordReset,
				new EmailTemplateDetails {
					TemplateId = "pq3enl66dk5l2vwr",
					Subject = "LOVAMAP - Reset your password"
				}
			}
		};
	}
}