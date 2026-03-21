using LastMile.TMS.Application.Features.Zones.Commands;
using LastMile.TMS.Application.Features.Zones.DTOs;
using LastMile.TMS.Application.Features.Zones.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LastMile.TMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,OperationsManager")]
public class ZonesController : ControllerBase
{
    private readonly IMediator _mediator;

    public ZonesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<List<ZoneDto>>> GetAll(
        [FromQuery] Guid? depotId = null,
        [FromQuery] bool? includeInactive = null)
    {
        var result = await _mediator.Send(new GetAllZones.Query(depotId, includeInactive));
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ZoneDto>> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetZoneById.Query(id));
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ZoneDto>> Create([FromBody] CreateZoneDto dto)
    {
        var result = await _mediator.Send(new CreateZone.Command(dto));
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ZoneDto>> Update(Guid id, [FromBody] UpdateZoneDto dto)
    {
        if (id != dto.Id)
            return BadRequest("ID in URL does not match ID in body");

        var result = await _mediator.Send(new UpdateZone.Command(dto));
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<bool>> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteZone.Command(id));
        return Ok(result);
    }
}