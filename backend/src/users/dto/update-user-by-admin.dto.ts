import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import { normalizeEmail, normalizeName } from '../user-normalization';

export class UpdateUserByAdminDto {
  @ValidateIf(
    (dto: UpdateUserByAdminDto) =>
      dto.name === undefined &&
      dto.email === undefined &&
      dto.role === undefined,
  )
  @IsDefined({ message: 'At least one user field must be provided' })
  private readonly atLeastOneField?: never;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @ValidateIf(
    (_dto: UpdateUserByAdminDto, value: unknown) => value !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @ValidateIf(
    (_dto: UpdateUserByAdminDto, value: unknown) => value !== undefined,
  )
  @IsString()
  @IsEmail()
  email?: string;

  @ValidateIf(
    (_dto: UpdateUserByAdminDto, value: unknown) => value !== undefined,
  )
  @IsEnum(UserRole)
  role?: UserRole;
}
