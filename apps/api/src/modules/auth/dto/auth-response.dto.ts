import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ type: [String] })
  roles: string[];

  @ApiProperty()
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty()
  user: UserResponseDto;

  @ApiProperty()
  token: string;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  data: T | null;

  @ApiProperty({ nullable: true })
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
}
