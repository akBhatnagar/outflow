import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('GET /health/live returns ok', () => {
    const result = controller.live();
    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
  });

  it('GET /health/version returns metadata', () => {
    const result = controller.version();
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('env');
  });
});
