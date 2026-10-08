import { IsISO6391, IsNotEmpty, IsString } from 'class-validator';

export class CreateTranscriptionDto {
  @IsString()
  @IsNotEmpty()
  @IsISO6391()
  language: string;
}
