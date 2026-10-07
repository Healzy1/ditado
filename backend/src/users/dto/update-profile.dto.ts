import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';
import { normalizeEmail, normalizeName } from '../user-normalization';

export class UpdateProfileDto {
  @ValidateIf(
    (dto: UpdateProfileDto) =>
      dto.name === undefined && dto.email === undefined,
  )
  @IsDefined({ message: 'At least one profile field must be provided' })
  private readonly atLeastOneField?: never;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @ValidateIf((_dto: UpdateProfileDto, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @ValidateIf((_dto: UpdateProfileDto, value: unknown) => value !== undefined)
  @IsString()
  @IsEmail()
  email?: string;
}
