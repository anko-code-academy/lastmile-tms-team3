using LastMile.TMS.Application.Features.Depots.Commands;
using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Application.Features.Depots.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LastMile.TMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,OperationsManager")]
public class DepotsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DepotsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<List<DepotDto>>> GetAll([FromQuery] bool? includeInactive = null)
    {
        var result = await _mediator.Send(new GetAllDepots.Query(includeInactive));
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DepotDto>> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetDepotById.Query(id));
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<DepotDto>> Create([FromBody] CreateDepotDto dto)
    {
        var result = await _mediator.Send(new CreateDepot.Command(dto));
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DepotDto>> Update(Guid id, [FromBody] UpdateDepotDto dto)
    {
        if (id != dto.Id)
            return BadRequest("ID in URL does not match ID in body");

        var result = await _mediator.Send(new UpdateDepot.Command(dto));
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<bool>> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteDepot.Command(id));
        return Ok(result);
    }
}