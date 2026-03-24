using Hangfire;
using Hangfire.PostgreSql;
using LastMile.TMS.Api.GraphQL.ErrorFilters;
using LastMile.TMS.Api.GraphQL.Mutations;
using LastMile.TMS.Api.GraphQL.Queries;
using LastMile.TMS.Application;
using LastMile.TMS.Infrastructure;
using LastMile.TMS.Persistence;
using LastMile.TMS.Persistence.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.OpenApi;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, config) =>
        config.ReadFrom.Configuration(context.Configuration));

    builder.Services
        .AddApplication()
        .AddInfrastructure(builder.Configuration)
        .AddPersistence(builder.Configuration);

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme;
    });

    builder.Services.AddOpenIddict()
        .AddCore(options =>
        {
            options.UseEntityFrameworkCore()
                   .UseDbContext<AppDbContext>()
                   .ReplaceDefaultEntities<Guid>();
        })
        .AddServer(options =>
        {
            options.SetTokenEndpointUris("/connect/token");

            options.AllowPasswordFlow();
            options.AllowRefreshTokenFlow();

            options.AcceptAnonymousClients();

            options.AddEphemeralEncryptionKey()
                   .AddEphemeralSigningKey()
                   .DisableAccessTokenEncryption();

            var aspNetCoreOptions = options.UseAspNetCore()
                   .EnableTokenEndpointPassthrough();

            if (builder.Environment.IsDevelopment())
                aspNetCoreOptions.DisableTransportSecurityRequirement();
        })
        .AddValidation(options =>
        {
            options.UseLocalServer();
            options.UseAspNetCore();
        });

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("Authenticated", policy =>
        {
            policy.AuthenticationSchemes.Add(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
            policy.RequireAuthenticatedUser();
        });

        options.AddPolicy("Admin", policy =>
        {
            policy.AuthenticationSchemes.Add(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
            policy.RequireAuthenticatedUser();
            policy.RequireRole("Admin");
        });

        options.AddPolicy("OperationsManager", policy =>
        {
            policy.AddAuthenticationSchemes(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
            policy.RequireAuthenticatedUser();
            policy.RequireRole("OperationsManager");
        });
    });

    builder.Services
        .AddGraphQLServer()
        .AddAuthorization()
        .AddQueryType<Query>()
        .AddMutationType<Mutation>()
        .AddType<DepotQuery>()
        .AddType<ZoneQuery>()
        .AddType<ParcelMutation>()
        .AddType<VehicleQuery>()
        .AddType<VehicleMutation>()
        .AddType<UserQuery>()
        .AddType<UserMutation>()
        .AddErrorFilter<ValidationErrorFilter>();

    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Paste the access_token from POST /connect/token"
        });
        options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecuritySchemeReference("Bearer"),
                new List<string>()
            }
        });
    });
    builder.Services.AddSignalR();
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });

    builder.Services.AddStackExchangeRedisCache(options =>
        options.Configuration = builder.Configuration.GetConnectionString("Redis"));

    builder.Services.AddHangfire(config =>
        config.UsePostgreSqlStorage(options =>
            options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("HangfireConnection"))));
    builder.Services.AddHangfireServer();

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseHttpsRedirection();
    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapGraphQL("/graphql");
    app.UseHangfireDashboard("/hangfire");

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Required for WebApplicationFactory in integration tests
namespace LastMile.TMS.Api
{
    public partial class Program;
}
