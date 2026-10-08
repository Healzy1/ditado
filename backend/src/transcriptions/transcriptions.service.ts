import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { extname } from 'node:path';
import { Repository } from 'typeorm';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import { Transcription } from './entities/transcription.entity';
import { GroqTranscriptionClient } from './groq-transcription.client';

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

const ACCEPTED_AUDIO_TYPES: Record<string, readonly string[]> = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  m4a: ['audio/mp4', 'audio/x-m4a'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
  ogg: ['audio/ogg', 'application/ogg'],
  webm: ['audio/webm', 'video/webm'],
  flac: ['audio/flac', 'audio/x-flac'],
  mp4: ['audio/mp4', 'video/mp4'],
  mpeg: ['audio/mpeg'],
};

export interface PublicTranscription {
  id: string;
  text: string;
  originalFilename: string;
  language: string;
  createdAt: Date;
}

@Injectable()
export class TranscriptionsService {
  constructor(
    @InjectRepository(Transcription)
    private readonly transcriptionsRepository: Repository<Transcription>,
    private readonly groq: GroqTranscriptionClient,
  ) {}

  async create(
    userId: string,
    file: Express.Multer.File | undefined,
    input: CreateTranscriptionDto,
  ): Promise<PublicTranscription> {
    this.validateAudioFile(file);
    const text = await this.groq.transcribe(file, input.language);
    const transcription = await this.transcriptionsRepository.save(
      this.transcriptionsRepository.create({
        text,
        originalFilename: file.originalname,
        language: input.language,
        userId,
      }),
    );

    return this.toPublicTranscription(transcription);
  }

  async findAll(userId: string): Promise<PublicTranscription[]> {
    const transcriptions = await this.transcriptionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return transcriptions.map((transcription) =>
      this.toPublicTranscription(transcription),
    );
  }

  async findOne(userId: string, id: string): Promise<PublicTranscription> {
    const transcription = await this.transcriptionsRepository.findOne({
      where: { id, userId },
    });
    if (!transcription) {
      throw new NotFoundException('Transcription not found');
    }
    return this.toPublicTranscription(transcription);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.transcriptionsRepository.delete({ id, userId });
    if (result.affected !== 1) {
      throw new NotFoundException('Transcription not found');
    }
  }

  private validateAudioFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      throw new BadRequestException('Audio file is too large');
    }

    const extension = extname(file.originalname).slice(1).toLowerCase();
    const acceptedMimeTypes = ACCEPTED_AUDIO_TYPES[extension];
    if (!acceptedMimeTypes || !acceptedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported audio format');
    }
  }

  private toPublicTranscription(
    transcription: Transcription,
  ): PublicTranscription {
    return {
      id: transcription.id,
      text: transcription.text,
      originalFilename: transcription.originalFilename,
      language: transcription.language,
      createdAt: transcription.createdAt,
    };
  }
}
