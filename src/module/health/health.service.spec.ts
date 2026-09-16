/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should return status ok and database connected when query succeeds', async () => {
    const result = await service.checkHealth();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
    expect(result.memory.rss).toBeDefined();
  });

  it('should return status degraded and database disconnected when query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection timeout'));

    const result = await service.checkHealth();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('disconnected');
  });
});
