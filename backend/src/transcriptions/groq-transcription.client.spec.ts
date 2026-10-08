import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/environment';
import { GroqTranscriptionClient } from './groq-transcription.client';

const audioFile = {
  originalname: 'recording.mp3',
  mimetype: 'audio/mpeg',
  buffer: Buffer.from('controlled audio'),
} as Express.Multer.File;

function createClient(): GroqTranscriptionClient {
  const config = new ConfigService<EnvironmentVariables, true>({
    GROQ_API_KEY: 'gsk_test_value',
    GROQ_TRANSCRIPTION_MODEL: 'whisper-large-v3-turbo',
  } as EnvironmentVariables);
  return new GroqTranscriptionClient(config);
}

describe('GroqTranscriptionClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends the configured model and returns the Groq text', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: 'Texto transcrito' })),
      );

    await expect(createClient().transcribe(audioFile, 'pt')).resolves.toBe(
      'Texto transcrito',
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer gsk_test_value' },
      }),
    );
  });

  it('maps provider and response failures to a safe bad gateway error', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('failure', { status: 500 }));
    await expect(
      createClient().transcribe(audioFile, 'pt'),
    ).rejects.toBeInstanceOf(BadGatewayException);

    jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('network details'));
    await expect(
      createClient().transcribe(audioFile, 'pt'),
    ).rejects.toMatchObject({
      message: 'Unable to transcribe audio',
    });
  });
});
