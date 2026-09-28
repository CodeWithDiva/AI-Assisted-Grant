import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { shouldReport } from './reporting-exception.filter';

describe('shouldReport', () => {
  it('ignores expected client errors', () => {
    expect(shouldReport(new BadRequestException())).toBe(false);
    expect(shouldReport(new NotFoundException())).toBe(false);
  });

  it('reports server errors and anything that is not an HTTP exception', () => {
    expect(shouldReport(new InternalServerErrorException())).toBe(true);
    expect(shouldReport(new TypeError('boom'))).toBe(true);
    expect(shouldReport('a thrown string')).toBe(true);
  });
});
