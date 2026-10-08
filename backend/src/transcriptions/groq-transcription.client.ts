import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/environment';

interface GroqTranscriptionResponse {
  text?: unknown;
}

@Injectable()
export class GroqTranscriptionClient {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async transcribe(
    file: Express.Multer.File,
    language: string,
  ): Promise<string> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );
    form.append(
      'model',
      this.config.get('GROQ_TRANSCRIPTION_MODEL', { infer: true }),
    );
    form.append('language', language);

    let response: Response;
    try {
      response = await fetch(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.get('GROQ_API_KEY', { infer: true })}`,
          },
          body: form,
        },
      );
    } catch {
      throw new BadGatewayException('Unable to transcribe audio');
    }

    if (!response.ok) {
      throw new BadGatewayException('Unable to transcribe audio');
    }

    let payload: GroqTranscriptionResponse;
    try {
      payload = (await response.json()) as GroqTranscriptionResponse;
    } catch {
      throw new BadGatewayException('Unable to transcribe audio');
    }

    if (typeof payload.text !== 'string') {
      throw new BadGatewayException('Unable to transcribe audio');
    }

    return payload.text;
  }
}
