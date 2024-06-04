using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

using Data;
using Data.Models;
using Infrastructure.Helpers;
using Repositories.IRepositories;
using Repositories.Repositories;
using Services.IServices;
using Services.Services;
using Infrastructure;

var builder = WebApplication.CreateBuilder(args);

var jwtIssuer = builder.Configuration.GetSection("Jwt:Issuer").Get<string>();
var jwtKey = builder.Configuration.GetSection("Jwt:Key").Get<string>();

builder.Services.AddDbContext<DataContext>(options => {
    options.UseNpgsql(builder.Configuration.GetConnectionString("LOVAMAP_DB"));
});

builder.Services.AddIdentity<User, Role>()
    .AddEntityFrameworkStores<DataContext>()
    .AddDefaultTokenProviders();

if (string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtKey))
{
    throw new Exception("JWT configuration must include issuer and key");
}

builder.Services.AddAuthentication(cfg => {
    cfg.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    cfg.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateLifetime = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("CorsPolicy", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowCredentials().WithOrigins("http://localhost:3000");
    });
});

// Add repository service registrations
builder.Services.AddScoped<IScaffoldGroupRepository, ScaffoldGroupRepository>();
builder.Services.AddScoped<IInputGroupRepository, InputGroupRepository>();
builder.Services.AddScoped<IDescriptorRepository, DescriptorRepository>();
builder.Services.AddScoped<IDownloadRepository, DownloadRepository>();
builder.Services.AddScoped<ITagRepository, TagRepository>();

// Add helpers
builder.Services.AddScoped<IUserAuthHelper, UserAuthHelper>();
builder.Services.AddScoped<IJwtGeneratorHelper, JwtGeneratorHelper>();
builder.Services.AddScoped<IUserContextHelper, UserContextHelper>();

// Add services registrations
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IDescriptorService, DescriptorService>();
builder.Services.AddScoped<IDownloadService, DownloadService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IScaffoldGroupService, ScaffoldGroupService>();

builder.Services.AddScoped<IModelMapper, ModelMapper>();
builder.Services.AddScoped<SeedingService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("CorsPolicy");
}

// Running migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DataContext>();
    db.Database.Migrate();
}

// Seeding data
var scopeFactory = app.Services.GetRequiredService<IServiceScopeFactory>();
using (var scope = scopeFactory.CreateScope())
{
    var seedingService = scope.ServiceProvider.GetRequiredService<SeedingService>();
    await seedingService.SeedAllAsync();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
