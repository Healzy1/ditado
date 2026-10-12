import { ValidationPipe } from '@nestjs/common';
import { ChangePasswordDto } from './change-password.dto';
import { DeleteAccountDto } from './delete-account.dto';
import { UpdateProfileDto } from './update-profile.dto';
import { UpdateUserByAdminDto } from './update-user-by-admin.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('account management DTOs', () => {
  it('requires at least one profile field and normalizes values', async () => {
    await expect(
      pipe.transform({}, { type: 'body', metatype: UpdateProfileDto }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      pipe.transform(
        { name: '  Ana  ', email: ' ANA@EXAMPLE.TEST ' },
        { type: 'body', metatype: UpdateProfileDto },
      ),
    ).resolves.toMatchObject({ name: 'Ana', email: 'ana@example.test' });
  });

  it('rejects fields outside each account-management contract', async () => {
    await expect(
      pipe.transform(
        { name: 'Ana', role: 'admin' },
        { type: 'body', metatype: UpdateProfileDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      pipe.transform(
        {
          currentPassword: 'senha-atual-123',
          newPassword: 'senha-nova-123',
          role: 'admin',
        },
        { type: 'body', metatype: ChangePasswordDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      pipe.transform({}, { type: 'body', metatype: DeleteAccountDto }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      pipe.transform(
        { name: ' Ana ', email: ' ANA@EXAMPLE.TEST ', role: 'admin' },
        { type: 'body', metatype: UpdateUserByAdminDto },
      ),
    ).resolves.toMatchObject({
      name: 'Ana',
      email: 'ana@example.test',
      role: 'admin',
    });
    await expect(
      pipe.transform({}, { type: 'body', metatype: UpdateUserByAdminDto }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      pipe.transform(
        { role: 'owner' },
        { type: 'body', metatype: UpdateUserByAdminDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      pipe.transform(
        { name: 'Ana', passwordHash: 'not-allowed' },
        { type: 'body', metatype: UpdateUserByAdminDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
