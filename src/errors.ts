/**
 * This module provides Twirp errors according to the Twirp spec.
 */

export class TwirpError extends Error {
  public statusCode = 500;
  public message: string = this.message;
  public name = 'internal';
  public isTwirpError: true = true;
}

enum TwirpErrorCode {
  // Canceled indicates the operation was cancelled (typically by the caller).
  Canceled = 'canceled',

  // Unknown error. For example when handling errors raised by APIs that do not
  // return enough error information.
  Unknown = 'unknown',

  // InvalidArgument indicates client specified an invalid argument. It
  // indicates arguments that are problematic regardless of the state of the
  // system (i.e. a malformed file name, required argument, number out of range,
  // etc.).
  InvalidArgument = 'invalid_argument',

  // DeadlineExceeded means operation expired before completion. For operations
  // that change the state of the system, this error may be returned even if the
  // operation has completed successfully (timeout).
  DeadlineExceeded = 'deadline_exceeded',

  // NotFound means some requested entity was not found.
  NotFound = 'not_found',

  // BadRoute means that the requested URL path wasn't routable to a Twirp
  // service and method. This is returned by the generated server, and usually
  // shouldn't be returned by applications. Instead, applications should use
  // NotFound or Unimplemented.
  BadRoute = 'bad_route',

  // AlreadyExists means an attempt to create an entity failed because one
  // already exists.
  AlreadyExists = 'already_exists',

  // PermissionDenied indicates the caller does not have permission to execute
  // the specified operation. It must not be used if the caller cannot be
  // identified (Unauthenticated).
  PermissionDenied = 'permission_denied',

  // Unauthenticated indicates the request does not have valid authentication
  // credentials for the operation.
  Unauthenticated = 'unauthenticated',

  // ResourceExhausted indicates some resource has been exhausted, perhaps a
  // per-user quota, or perhaps the entire file system is out of space.
  ResourceExhausted = 'resource_exhausted',

  // FailedPrecondition indicates operation was rejected because the system is
  // not in a state required for the operation's execution. For example, doing
  // an rmdir operation on a directory that is non-empty, or on a non-directory
  // object, or when having conflicting read-modify-write on the same resource.
  FailedPrecondition = 'failed_precondition',

  // Aborted indicates the operation was aborted, typically due to a concurrency
  // issue like sequencer check failures, transaction aborts, etc.
  Aborted = 'aborted',

  // OutOfRange means operation was attempted past the valid range. For example,
  // seeking or reading past end of a paginated collection.
  //
  // Unlike InvalidArgument, this error indicates a problem that may be fixed if
  // the system state changes (i.e. adding more items to the collection).
  //
  // There is a fair bit of overlap between FailedPrecondition and OutOfRange.
  // We recommend using OutOfRange (the more specific error) when it applies so
  // that callers who are iterating through a space can easily look for an
  // OutOfRange error to detect when they are done.
  OutOfRange = 'out_of_range',

  // Unimplemented indicates operation is not implemented or not
  // supported/enabled in this service.
  Unimplemented = 'unimplemented',

  // Internal errors. When some invariants expected by the underlying system
  // have been broken. In other words, something bad happened in the library or
  // backend service. Do not confuse with HTTP Internal Server Error; an
  // Internal error could also happen on the client code, i.e. when parsing a
  // server response.
  Internal = 'internal',

  // Unavailable indicates the service is currently unavailable. This is a most
  // likely a transient condition and may be corrected by retrying with a
  // backoff.
  Unavailable = 'unavailable',

  // DataLoss indicates unrecoverable data loss or corruption.
  DataLoss = 'data_loss',
}

// NotFoundError for the common NotFound error.
export class NotFoundError extends TwirpError {
  statusCode = 404;
  name = TwirpErrorCode.NotFound;
}

// InvalidArgumentError constructor for the common InvalidArgument error. Can be
// used when an argument has invalid format, is a number out of range, is a bad
// option, etc).
export class InvalidArgumentError extends TwirpError {
  statusCode = 400;
  name = TwirpErrorCode.InvalidArgument;
}

// RequiredArgumentError is a more specific constructor for InvalidArgument
// error. Should be used when the argument is required (expected to have a
// non-zero value).
export class RequiredArgumentError extends TwirpError {
  statusCode = 400;
  name = TwirpErrorCode.InvalidArgument;
  constructor(argumentName: string) {
    super(`${argumentName} is required`);
  }
}

// InternalError constructor for the common Internal error. Should be used to
// specify that something bad or unexpected happened.
export class InternalServerError extends TwirpError {
  statusCode = 500;
  name = TwirpErrorCode.Internal;
}

// badRouteError is used when the twirp server cannot route a request`)
export class BadRouteError extends TwirpError {
  statusCode = 404;
  name = TwirpErrorCode.BadRoute;
}

// twirpErrorFromIntermediary maps HTTP errors from non-twirp sources to twirp errors.
// The mapping is similar to gRPC: https://github.com/grpc/grpc/blob/master/doc/http-grpc-status-mapping.md.
export function twirpErrorFromIntermediary(
  status: number,
  // msg: string,
  // bodyOrLocation: string,
): TwirpErrorCode {
  let code = TwirpErrorCode.Unknown;
  if (status >= 300 && status <= 399) {
    code = TwirpErrorCode.Internal;
  } else {
    switch (status) {
      case 400: // Bad Request
        code = TwirpErrorCode.Internal;
        break;
      case 401: // Unauthorized
        code = TwirpErrorCode.Unauthenticated;
        break;
      case 403: // Forbidden
        code = TwirpErrorCode.PermissionDenied;
        break;
      case 404: // Not Found
        code = TwirpErrorCode.BadRoute;
        break;
      case 429: // Too Many Requests
      case 502: // Bad Gateway
      case 503: // Service Unavailable
      case 504: // Gateway Timeout
        code = TwirpErrorCode.Unavailable;
        break;
      default:
        // All other codes
        code = TwirpErrorCode.Unknown;
    }
  }

  return code;
}
