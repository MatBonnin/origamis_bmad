import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateMentorSelfProfileDto,
  UpdateMentorSelfProfileDto,
} from './mentor-self-profile.dto';

describe('MentorSelfProfileDto', () => {
  it('accepts a valid create payload', async () => {
    const dto = plainToInstance(CreateMentorSelfProfileDto, {
      domain: 'informatique',
      expertiseTags: ['react', 'typescript'],
      supportedLevels: ['intermediaire'],
      languages: ['fr', 'en'],
      certifications: ['coach-cert'],
      bio: 'Mentor frontend',
      bannerUrl: 'https://cdn.origami.app/banner.png',
      about: 'Mentor specialise front-end avec 7 ans d experience.',
      educationLevel: 'bac+5',
      degrees: ['Master Informatique'],
      keywords: ['gestion de projet', 'memoire'],
      professionalLinks: ['https://www.linkedin.com/in/alice-martin'],
      supportTypes: ['ponctuel', 'suivi_regulier'],
      tariffs: { min: 30, max: 50, currency: 'EUR' },
      availability: {
        isAvailable: true,
        nextAvailableAt: '2026-02-20T09:00:00.000Z',
        slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      },
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid currency', async () => {
    const dto = plainToInstance(CreateMentorSelfProfileDto, {
      domain: 'informatique',
      expertiseTags: ['react'],
      tariffs: { min: 30, max: 50, currency: 'eur' },
      availability: { isAvailable: true },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects empty expertise tags list', async () => {
    const dto = plainToInstance(CreateMentorSelfProfileDto, {
      domain: 'informatique',
      expertiseTags: [],
      tariffs: { min: 30, max: 50, currency: 'EUR' },
      availability: { isAvailable: true },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts partial update payload', async () => {
    const dto = plainToInstance(UpdateMentorSelfProfileDto, {
      domain: 'informatique',
      availability: {
        isAvailable: false,
      },
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid availability slot format', async () => {
    const dto = plainToInstance(UpdateMentorSelfProfileDto, {
      availability: {
        isAvailable: true,
        slots: [{ dayOfWeek: 1, startTime: '25:00', endTime: '12:00' }],
      },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid professional link URL format', async () => {
    const dto = plainToInstance(CreateMentorSelfProfileDto, {
      domain: 'informatique',
      expertiseTags: ['react'],
      professionalLinks: ['linkedin.com/in/no-protocol'],
      tariffs: { min: 30, max: 50, currency: 'EUR' },
      availability: { isAvailable: true },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid support type', async () => {
    const dto = plainToInstance(CreateMentorSelfProfileDto, {
      domain: 'informatique',
      expertiseTags: ['react'],
      supportTypes: ['invalid'],
      tariffs: { min: 30, max: 50, currency: 'EUR' },
      availability: { isAvailable: true },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
