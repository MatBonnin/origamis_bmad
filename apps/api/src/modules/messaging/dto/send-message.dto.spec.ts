import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendMessageDto } from './send-message.dto';

describe('SendMessageDto', () => {
  it('accepts valid payload', async () => {
    const dto = plainToInstance(SendMessageDto, {
      receiverId: 'c95f03d0-2963-447e-b17d-adf7dff6da1f',
      body: 'Bonjour mentor',
      notifyChannel: 'push',
      clientMessageId: 'client-1',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(SendMessageDto, {
      receiverId: 'not-uuid',
      body: '',
      notifyChannel: 'email',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
