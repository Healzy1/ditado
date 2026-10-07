import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { normalizeEmail, normalizeName } from '../../users/user-normalization';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
