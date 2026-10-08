import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Transcription } from './entities/transcription.entity';
import { GroqTranscriptionClient } from './groq-transcription.client';
import { TranscriptionsController } from './transcriptions.controller';
import { TranscriptionsService } from './transcriptions.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Transcription])],
  controllers: [TranscriptionsController],
  providers: [GroqTranscriptionClient, TranscriptionsService],
})
export class TranscriptionsModule {}
