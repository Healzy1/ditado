import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Transcription } from './entities/transcription.entity';
import { GroqTranscriptionClient } from './groq-transcription.client';
import { TranscriptionsService } from './transcriptions.service';

function file(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'recording.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    size: 16,
    buffer: Buffer.from('controlled audio'),
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
    ...overrides,
  };
}

function transcription(overrides: Partial<Transcription> = {}): Transcription {
  return {
    id: 'transcription-id',
    text: 'Texto transcrito',
    originalFilename: 'recording.mp3',
    language: 'pt',
    createdAt: new Date('2026-10-04T20:00:00.000Z'),
    userId: 'user-id',
    user: undefined as never,
    ...overrides,
  };
}

function createService() {
  const repository = {
    create: jest.fn((value: Partial<Transcription>) => transcription(value)),
    save: jest.fn((value: Transcription) => Promise.resolve(value)),
    find: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(() => Promise.resolve(null)),
    delete: jest.fn(() => Promise.resolve({ affected: 0 })),
  };
  const groq = {
    transcribe: jest.fn<Promise<string>, [Express.Multer.File, string]>(),
  };

  return {
    repository,
    groq,
    service: new TranscriptionsService(
      repository as never,
      groq as unknown as GroqTranscriptionClient,
    ),
  };
}

describe('TranscriptionsService', () => {
  it('rejects missing or unsupported audio before calling Groq', async () => {
    const { groq, service } = createService();

    await expect(
      service.create('user-id', undefined, { language: 'pt' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        'user-id',
        file({ originalname: 'recording.txt', mimetype: 'text/plain' }),
        {
          language: 'pt',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(groq.transcribe).not.toHaveBeenCalled();
  });

  it('persists a transcription only after Groq returns text', async () => {
    const { groq, repository, service } = createService();
    groq.transcribe.mockRejectedValueOnce(new Error('provider unavailable'));

    await expect(
      service.create('user-id', file(), { language: 'pt' }),
    ).rejects.toThrow('provider unavailable');
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();

    groq.transcribe.mockResolvedValueOnce('Texto da Groq');
    await expect(
      service.create('user-id', file(), { language: 'pt' }),
    ).resolves.toMatchObject({
      text: 'Texto da Groq',
      originalFilename: 'recording.mp3',
      language: 'pt',
    });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('filters reads and deletes by the authenticated user', async () => {
    const { repository, service } = createService();
    repository.find.mockResolvedValueOnce([transcription()]);

    await expect(service.findAll('user-id')).resolves.toEqual([
      expect.objectContaining({ id: 'transcription-id' }),
    ]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      order: { createdAt: 'DESC' },
    });
    await expect(service.findOne('user-id', 'other-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'other-id', userId: 'user-id' },
    });
    await expect(service.remove('user-id', 'other-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.delete).toHaveBeenCalledWith({
      id: 'other-id',
      userId: 'user-id',
    });
  });
});
