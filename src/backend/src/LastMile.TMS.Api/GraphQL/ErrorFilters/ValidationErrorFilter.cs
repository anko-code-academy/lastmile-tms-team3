using FluentValidation;
using HotChocolate;

namespace LastMile.TMS.Api.GraphQL.ErrorFilters;

public class ValidationErrorFilter : IErrorFilter
{
    public IError OnError(IError error)
    {
        if (error.Exception is ValidationException validationException)
        {
            var errors = validationException.Errors
                .Select(e => new { e.PropertyName, e.ErrorMessage })
                .ToList();

            var message = errors.Count > 0
                ? errors.First().ErrorMessage
                : validationException.Message;

            return error
                .WithMessage(message)
                .SetExtension("validationErrors", errors)
                .SetExtension("code", "VALIDATION_ERROR");
        }

        if (error.Exception is not null)
        {
            return error
                .WithMessage(error.Exception.Message)
                .SetExtension("code", error.Exception.GetType().Name);
        }

        return error;
    }
}