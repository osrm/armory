import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDefined, ValidateNested } from 'class-validator'
import { UserDto } from './user.dto'

export class CreateUserResponseDto {
  @IsDefined()
  @Type(() => UserDto)
  @ValidateNested()
  @ApiProperty()
  user: UserDto

  constructor(partial: Partial<CreateUserResponseDto>) {
    Object.assign(this, partial)
  }
}