export class ServiceNotConfiguredError extends Error {
  public readonly code = 'SERVICE_NOT_CONFIGURED'
  public readonly serviceName: string
  public readonly missingVariables: string[]
  public readonly statusCode = 503

  constructor(serviceName: string, missingVariables: string[]) {
    super(
      `The ${serviceName} integration is not configured. Missing required environment variables: ${missingVariables.join(
        ', '
      )}`
    )
    this.name = 'ServiceNotConfiguredError'
    this.serviceName = serviceName
    this.missingVariables = missingVariables
  }
}

export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR'
  public readonly statusCode = 400
  public readonly details: any

  constructor(message: string, details?: any) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class NotFoundError extends Error {
  public readonly code = 'NOT_FOUND'
  public readonly statusCode = 404

  constructor(resource: string, identifier?: string) {
    super(`${resource} ${identifier ? `(${identifier}) ` : ''}not found`)
    this.name = 'NotFoundError'
  }
}

export class IllegalStateTransitionError extends Error {
  public readonly code = 'ILLEGAL_STATE_TRANSITION'
  public readonly statusCode = 409

  constructor(currentStatus: string, requestedStatus: string, reason?: string) {
    super(
      `Cannot transition review draft from state '${currentStatus}' to '${requestedStatus}'${
        reason ? `: ${reason}` : '.'
      }`
    )
    this.name = 'IllegalStateTransitionError'
  }
}
