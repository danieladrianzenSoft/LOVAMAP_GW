using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

using Data;
using Data.Models;
using Repositories.IRepositories;
using Repositories.Repositories;
using Services.IServices;
using Services.Services;
using Infrastructure.DTOs;
using Infrastructure.Helpers;
using Infrastructure.IHelpers;
using Infrastructure;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

var jwtIssuer = builder.Configuration.GetSection("Jwt:Issuer").Get<string>();
var jwtKey = builder.Configuration.GetSection("Jwt:Key").Get<string>();

var connectionString = Environment.GetEnvironmentVariable("LOVAMAP_DB") 
    ?? builder.Configuration.GetConnectionString("LOVAMAP_DB");

builder.Services.AddDbContext<DataContext>(options => {
    options.UseNpgsql(connectionString);
});

builder.Services.AddIdentity<User, Role>()
    .AddEntityFrameworkStores<DataContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.SignIn.RequireConfirmedEmail = true;
});

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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = ClaimTypes.Role
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
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithOrigins("http://localhost:3000",
                "http://localhost:5001",
                "http://152.3.103.246:3000",
                "https://lovamap.com")
            .WithExposedHeaders("X-Domain-Id", 
                "X-Scaffold-Id", 
                "X-Category", 
                "X-Voxel-Count", 
                "X-Voxel-Size", 
                "X-Domain-Size", 
                "X-Original-Filename");
    });
});

// Add repository service registrations
builder.Services.AddScoped<IScaffoldGroupRepository, ScaffoldGroupRepository>();
builder.Services.AddScoped<IInputGroupRepository, InputGroupRepository>();
builder.Services.AddScoped<IDescriptorRepository, DescriptorRepository>();
builder.Services.AddScoped<IDownloadRepository, DownloadRepository>();
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddScoped<IImageRepository, ImageRepository>();
builder.Services.AddScoped<IPublicationRepository, PublicationRepository>();
builder.Services.AddScoped<IDomainRepository, DomainRepository>();
builder.Services.AddScoped<IAISearchRepository, AISearchRepository>();

// Add helpers
builder.Services.AddScoped<IUserAuthHelper, UserAuthHelper>();
builder.Services.AddScoped<IJwtGeneratorHelper, JwtGeneratorHelper>();
builder.Services.AddScoped<IUserContextHelper, UserContextHelper>();

var domainDataPath = builder.Configuration["DomainSettings:DataPath"]
                 ?? Environment.GetEnvironmentVariable("DOMAIN_DATA_PATH")
                 ?? "Data/Domains";

builder.Services.AddScoped<IDomainFileService>(provider =>
{
    var logger = provider.GetRequiredService<ILogger<DomainFileService>>();
    return new DomainFileService(domainDataPath, logger);
});

// Add services registrations
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IDescriptorService, DescriptorService>();
builder.Services.AddScoped<IDownloadService, DownloadService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IScaffoldGroupService, ScaffoldGroupService>();
builder.Services.AddScoped<IImageService, ImageService>();
builder.Services.AddScoped<IPublicationService, PublicationService>();
builder.Services.AddScoped<IDomainService, DomainService>();
builder.Services.AddScoped<IModelMapper, ModelMapper>();
builder.Services.AddScoped<ILovamapCoreJobService, LovamapCoreJobService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAISearchService, AISearchService>();
builder.Services.AddScoped<IScaffoldGroupMetadataService, ScaffoldGroupMetadataService>();
builder.Services.AddScoped<SeedingService>();

// Other services
builder.Services.AddHttpClient();

// Adding configurations as IOptions
builder.Services.Configure<CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CorsPolicy");

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

app.UseDefaultFiles(); // Serves `index.html` by default
app.UseStaticFiles();  // Serves files from the `wwwroot` directory

app.UseAuthentication();
app.UseAuthorization();

app.MapFallbackToFile("index.html");

app.MapControllers();

app.Run();
