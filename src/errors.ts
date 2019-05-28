/**
 * This module provides Twirp errors according to the Twirp spec.
 */

enum TwirpError {
	// Canceled indicates the operation was cancelled (typically by the caller).
	Canceled = "canceled",

	// Unknown error. For example when handling errors raised by APIs that do not
	// return enough error information.
	Unknown = "unknown",

	// InvalidArgument indicates client specified an invalid argument. It
	// indicates arguments that are problematic regardless of the state of the
	// system (i.e. a malformed file name, required argument, number out of range,
	// etc.).
	InvalidArgument = "invalid_argument",

	// DeadlineExceeded means operation expired before completion. For operations
	// that change the state of the system, this error may be returned even if the
	// operation has completed successfully (timeout).
	DeadlineExceeded = "deadline_exceeded",

	// NotFound means some requested entity was not found.
	NotFound = "not_found",

	// BadRoute means that the requested URL path wasn't routable to a Twirp
	// service and method. This is returned by the generated server, and usually
	// shouldn't be returned by applications. Instead, applications should use
	// NotFound or Unimplemented.
	BadRoute = "bad_route",

	// AlreadyExists means an attempt to create an entity failed because one
	// already exists.
	AlreadyExists = "already_exists",

	// PermissionDenied indicates the caller does not have permission to execute
	// the specified operation. It must not be used if the caller cannot be
	// identified (Unauthenticated).
	PermissionDenied = "permission_denied",

	// Unauthenticated indicates the request does not have valid authentication
	// credentials for the operation.
	Unauthenticated = "unauthenticated",

	// ResourceExhausted indicates some resource has been exhausted, perhaps a
	// per-user quota, or perhaps the entire file system is out of space.
	ResourceExhausted = "resource_exhausted",

	// FailedPrecondition indicates operation was rejected because the system is
	// not in a state required for the operation's execution. For example, doing
	// an rmdir operation on a directory that is non-empty, or on a non-directory
	// object, or when having conflicting read-modify-write on the same resource.
	FailedPrecondition = "failed_precondition",

	// Aborted indicates the operation was aborted, typically due to a concurrency
	// issue like sequencer check failures, transaction aborts, etc.
	Aborted = "aborted",

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
	OutOfRange = "out_of_range",

	// Unimplemented indicates operation is not implemented or not
	// supported/enabled in this service.
	Unimplemented = "unimplemented",

	// Internal errors. When some invariants expected by the underlying system
	// have been broken. In other words, something bad happened in the library or
	// backend service. Do not confuse with HTTP Internal Server Error; an
	// Internal error could also happen on the client code, i.e. when parsing a
	// server response.
	Internal = "internal",

	// Unavailable indicates the service is currently unavailable. This is a most
	// likely a transient condition and may be corrected by retrying with a
	// backoff.
	Unavailable = "unavailable",

	// DataLoss indicates unrecoverable data loss or corruption.
	DataLoss = "data_loss",
}

// NotFoundError for the common NotFound error.
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TwirpError.NotFound;
  }
}

// InvalidArgumentError constructor for the common InvalidArgument error. Can be
// used when an argument has invalid format, is a number out of range, is a bad
// option, etc).
export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TwirpError.InvalidArgument;
  }
}

// RequiredArgumentError is a more specific constructor for InvalidArgument
// error. Should be used when the argument is required (expected to have a
// non-zero value).
export class RequiredArgumentError extends Error {
  constructor(argument: string) {
    super(`${argument} is required`);
    this.name = TwirpError.InvalidArgument;
  }
}

// InternalError constructor for the common Internal error. Should be used to
// specify that something bad or unexpected happened.
export class InternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TwirpError.Internal;
  }
}

// badRouteError is used when the twirp server cannot route a request`)
export class BadRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TwirpError.BadRoute;
  }
}

// ServerHTTPStatusFromErrorCode maps a Twirp error type into a similar HTTP
// response status. It is used by the Twirp server handler to set the HTTP
// response status code. Returns 0 if the ErrorCode is invalid.
export function serverHTTPStatusFromErrorCode(code: TwirpError): number {
	switch (code) {
	case TwirpError.Canceled:
		return 408 // RequestTimeout
	case TwirpError.Unknown:
		return 500 // Internal Server Error
	case TwirpError.InvalidArgument:
		return 400 // BadRequest
	case TwirpError.DeadlineExceeded:
		return 408 // RequestTimeout
	case TwirpError.NotFound:
		return 404 // Not Found
	case TwirpError.BadRoute:
		return 404 // Not Found
	case TwirpError.AlreadyExists:
		return 409 // Conflict
	case TwirpError.PermissionDenied:
		return 403 // Forbidden
	case TwirpError.Unauthenticated:
		return 401 // Unauthorized
	case TwirpError.ResourceExhausted:
		return 403 // Forbidden
	case TwirpError.FailedPrecondition:
		return 412 // Precondition Failed
	case TwirpError.Aborted:
		return 409 // Conflict
	case TwirpError.OutOfRange:
		return 400 // Bad Request
	case TwirpError.Unimplemented:
		return 501 // Not Implemented
	case TwirpError.Internal:
		return 500 // Internal Server Error
	case TwirpError.Unavailable:
		return 503 // Service Unavailable
	case TwirpError.DataLoss:
		return 500 // Internal Server Error
	default:
		return 0 // Invalid!
	}
}

// IsValidErrorCode returns true if is one of the valid predefined constants.
export function isValidErrorCode(code: TwirpError): boolean {
	return serverHTTPStatusFromErrorCode(code) != 0
}

// twirpErrorFromIntermediary maps HTTP errors from non-twirp sources to twirp errors.
// The mapping is similar to gRPC: https://github.com/grpc/grpc/blob/master/doc/http-grpc-status-mapping.md.
export function twirpErrorFromIntermediary(status: number, msg: string, bodyOrLocation: string): TwirpError {
	let code = TwirpError.Unknown;
	if (status >= 300 && status <= 399) {
		code = TwirpError.Internal
	} else {
		switch (status) {
		case 400: // Bad Request
			code = TwirpError.Internal
		case 401: // Unauthorized
			code = TwirpError.Unauthenticated
		case 403: // Forbidden
			code = TwirpError.PermissionDenied
		case 404: // Not Found
			code = TwirpError.BadRoute
		case 429: // Too Many Requests
		case 502: // Bad Gateway
		case 503: // Service Unavailable
		case 504: // Gateway Timeout
			code = TwirpError.Unavailable
		default: // All other codes
			code = TwirpError.Unknown
		}
	}

	return code;
}
