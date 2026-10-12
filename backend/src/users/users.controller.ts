import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import { UsersService } from './users.service';
import type { AdministrativeUser, PublicUser } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: Request & { user: PublicUser }): PublicUser {
    return request.user;
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAll(): Promise<AdministrativeUser[]> {
    return this.usersService.findAllForAdmin();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findOne(@Param('id') id: string): Promise<AdministrativeUser> {
    return this.usersService.findOneForAdmin(id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @Req() request: Request & { user: PublicUser },
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    return this.usersService.updateOwnProfile(request.user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() request: Request & { user: PublicUser },
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changeOwnPassword(request.user.id, dto);
  }

  @Delete('me')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async deleteMe(
    @Req() request: Request & { user: PublicUser },
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    await this.usersService.deleteOwnAccount(request.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateUser(
    @Req() request: Request & { user: PublicUser },
    @Param('id') id: string,
    @Body() dto: UpdateUserByAdminDto,
  ): Promise<AdministrativeUser> {
    return this.usersService.updateUserByAdmin(request.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteUser(
    @Req() request: Request & { user: PublicUser },
    @Param('id') id: string,
  ): Promise<void> {
    await this.usersService.deleteUserByAdmin(request.user.id, id);
  }
}
