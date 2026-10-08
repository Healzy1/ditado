import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit } from '../auth/guards/rate-limit.decorator';
import { RateLimitGuard } from '../auth/guards/rate-limit.guard';
import type { PublicUser } from '../users/users.service';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import type { PublicTranscription } from './transcriptions.service';
import { TranscriptionsService } from './transcriptions.service';
import { UploadExceptionFilter } from './upload.exception-filter';

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

@Controller('transcriptions')
@UseFilters(UploadExceptionFilter)
export class TranscriptionsController {
  constructor(private readonly transcriptionsService: TranscriptionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit('transcription')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_AUDIO_SIZE_BYTES } }),
  )
  create(
    @Req() request: Request & { user: PublicUser },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateTranscriptionDto,
  ): Promise<PublicTranscription> {
    return this.transcriptionsService.create(request.user.id, file, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() request: Request & { user: PublicUser },
  ): Promise<PublicTranscription[]> {
    return this.transcriptionsService.findAll(request.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Req() request: Request & { user: PublicUser },
    @Param('id') id: string,
  ): Promise<PublicTranscription> {
    return this.transcriptionsService.findOne(request.user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Req() request: Request & { user: PublicUser },
    @Param('id') id: string,
  ): Promise<void> {
    await this.transcriptionsService.remove(request.user.id, id);
  }
}
