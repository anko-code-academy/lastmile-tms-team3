using Hangfire;
using Hangfire.PostgreSql;
using HotChocolate;
using LastMile.TMS.Api.GraphQL;
using LastMile.TMS.Application;
using LastMile.TMS.Infrastructure;
using LastMile.TMS.Persistence;
using LastMile.TMS.Persistence.Identity;
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

    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
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

    builder.Services.AddGraphQLServer()
        .AddQueryType<LastMile.TMS.Api.GraphQL.Queries.Query>()
        .AddMutationType<LastMile.TMS.Api.GraphQL.Mutations.Mutation>()
        .AddType<LastMile.TMS.Api.GraphQL.Queries.DepotQuery>()
        .AddType<LastMile.TMS.Api.GraphQL.Queries.ZoneQuery>()
        .AddType<LastMile.TMS.Api.GraphQL.Mutations.DepotMutation>()
        .AddType<LastMile.TMS.Api.GraphQL.Mutations.ZoneMutation>()
        .AddType<LastMile.TMS.Api.GraphQL.Mutations.ParcelMutation>()
        .AddErrorFilter<LastMile.TMS.Api.GraphQL.ErrorFilters.ValidationErrorFilter>();

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
