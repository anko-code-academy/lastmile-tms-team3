using Hangfire;
using Hangfire.PostgreSql;
using LastMile.TMS.Api.GraphQL.DataLoaders;
using LastMile.TMS.Api.GraphQL.ErrorFilters;
using LastMile.TMS.Api.GraphQL.Mutations;
using LastMile.TMS.Api.GraphQL.Queries;
using LastMile.TMS.Api.GraphQL.Types;
using LastMile.TMS.Api.Hubs;
using LastMile.TMS.Api.Jobs;
using LastMile.TMS.Application;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Services;
using LastMile.TMS.Infrastructure;
using LastMile.TMS.Persistence;
using LastMile.TMS.Persistence.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.OpenApi;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;
using QuestPDF.Infrastructure;
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
        .AddPersistence(builder.Configuration, builder.Environment);

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

            options.SetAccessTokenLifetime(TimeSpan.FromMinutes(60));
            options.SetRefreshTokenLifetime(TimeSpan.FromDays(7));

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

        options.AddPolicy("WarehouseManager", policy =>
        {
            policy.AddAuthenticationSchemes(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
            policy.RequireAuthenticatedUser();
            policy.RequireRole("WarehouseManager");
        });

        options.AddPolicy("AdminOrOperationsManager", policy =>
        {
            policy.AddAuthenticationSchemes(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
            policy.RequireAuthenticatedUser();
            policy.RequireRole("Admin", "OperationsManager");
        });

        options.AddPolicy("AdminOrWarehouseManager", policy =>
        {
            policy.AddAuthenticationSchemes(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
            policy.RequireAuthenticatedUser();
            policy.RequireRole("Admin", "WarehouseManager");
        });

        options.AddPolicy("AdminOrDepotOperator", policy =>
        {
            policy.AddAuthenticationSchemes(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
            policy.RequireAuthenticatedUser();
            policy.RequireRole("Admin", "DepotOperator", "WarehouseOperator");
        });

        options.AddPolicy("AdminOrDispatcher", policy =>
        {
            policy.AddAuthenticationSchemes(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
            policy.RequireAuthenticatedUser();
            policy.RequireRole("Admin", "Dispatcher", "OperationsManager");
        });
    });

    builder.Services
        .AddGraphQLServer()
        .AddAuthorization()
        .AddProjections()
        .AddFiltering()
        .AddSorting()
        .AddPagingArguments()
        .AddDataLoader<AisleBinsDataLoader>()
        .AddDataLoader<DepotParcelDashboardDataLoader>()
        .AddDataLoader<ParcelContentItemsCountDataLoader>()
        .RegisterDbContextFactory<AppDbContext>()
        .AddQueryType<Query>()
        .AddMutationType<Mutation>()
        .AddType<DepotQuery>()
        .AddType<DepotMutation>()
        .AddType<ZoneQuery>()
        .AddType<ZoneMutation>()
        .AddType<AisleQuery>()
        .AddType<AisleMutation>()
        .AddType<BinQuery>()
        .AddType<BinMutation>()
        .AddType<ParcelQuery>()
        .AddType<ParcelMutation>()
        .AddType<VehicleQuery>()
        .AddType<VehicleMutation>()
        .AddType<DriverQuery>()
        .AddType<DriverMutation>()
        .AddType<UserQuery>()
        .AddType<UserMutation>()
        .AddType<AuditLogQuery>()
        .AddType<DeliveryRouteQuery>()
        .AddType<RouteMutation>()
        .AddType<AddressType>()
        .AddType<DepotType>()
        .AddType<VehicleType>()
        .AddType<ZoneType>()
        .AddType<AisleType>()
        .AddType<BinType>()
        .AddType<DriverType>()
        .AddType<UserType>()
        .AddType<AuditLogType>()
        .AddType<OperatingHoursType>()
        .AddType<DailyAvailabilityType>()
        .AddType<DayOffType>()
        .AddType<ParcelType>()
        .AddType<TrackingEventType>()
        .AddType<DeliveryConfirmationType>()
        .AddType<ParcelContentItemType>()
        .AddType<ParcelWatcherType>()
        .AddType<DeliveryRouteType>()
        .AddType<InboundManifestQuery>()
        .AddType<RouteParcelType>()
        .AddErrorFilter<ValidationErrorFilter>()
        .ModifyCostOptions(options =>
        {
            options.EnforceCostLimits = false;

        });;

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
    builder.Services.AddScoped<IImportProgressNotifier, SignalRImportProgressNotifier>();
    builder.Services.AddSingleton<IDriverLocationService, SignalRDriverLocationService>();
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

    QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

    app.UseSerilogRequestLogging();
    app.UseHttpsRedirection();
    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapHub<ImportProgressHub>("/hubs/import-progress");
    app.MapHub<DriverLocationHub>("/hubs/driver-location");
    app.MapGraphQL("/graphql");
    app.UseHangfireDashboard("/hangfire");

    RecurringJob.AddOrUpdate<DriverSimulationJob>(
        "driver-simulation",
        job => job.SimulateAsync(),
        "*/5 * * * * *");

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
