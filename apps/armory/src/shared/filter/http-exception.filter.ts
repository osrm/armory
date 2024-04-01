import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Response } from 'express'
import { Config, Env } from '../../armory.config'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private logger = new Logger(HttpExceptionFilter.name)

  constructor(private configService: ConfigService<Config, true>) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus()

    const isProduction = this.configService.get('env') === Env.PRODUCTION

    this.logger.error(exception)

    response.status(status).json(
      isProduction
        ? {
            statusCode: status,
            message: exception.message,
            response: exception.getResponse()
          }
        : {
            statusCode: status,
            message: exception.message,
            response: exception.getResponse(),
            stack: exception.stack
          }
    )
  }
}