import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import type { Env } from '../../config/env';

/**
 * Files are addressed by a storage key (e.g. "orgId/uuid.pdf").
 * Development writes to a local folder; production will use S3 behind the same methods.
 */
@Injectable()
export class StorageService {
  private readonly driver: 'local' | 's3';
  private readonly uploadDir: string;

  constructor(config: ConfigService<Env, true>) {
    this.driver = config.get('STORAGE_DRIVER', { infer: true });
    this.uploadDir = resolve(config.get('UPLOAD_DIR', { infer: true }));
  }

  async save(organizationId: string, fileName: string, contents: Buffer): Promise<string> {
    this.assertLocal();
    const key = `${organizationId}/${randomUUID()}${extname(fileName).toLowerCase()}`;
    const target = this.pathFor(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);
    return key;
  }

  async read(key: string): Promise<Buffer> {
    this.assertLocal();
    return readFile(this.pathFor(key));
  }

  async remove(key: string): Promise<void> {
    this.assertLocal();
    await rm(this.pathFor(key), { force: true });
  }

  private pathFor(key: string): string {
    const target = resolve(join(this.uploadDir, key));
    // Keys come from the database, but never let one escape the upload folder.
    if (!target.startsWith(this.uploadDir)) throw new Error('Invalid storage key');
    return target;
  }

  private assertLocal(): void {
    if (this.driver !== 'local') {
      throw new NotImplementedException('S3 storage is not wired up yet');
    }
  }
}
