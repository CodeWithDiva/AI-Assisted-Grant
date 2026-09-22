import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';

interface StorageDriver {
  put(key: string, contents: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

/** Development: files live in a folder next to the API. */
class LocalDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  async put(key: string, contents: Buffer): Promise<void> {
    const target = this.pathFor(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await readFile(this.pathFor(key));
    } catch {
      throw new NotFoundException('Stored file not found');
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  private pathFor(key: string): string {
    const target = resolve(join(this.root, key));
    // Keys come from the database, but never let one escape the upload folder.
    if (!target.startsWith(this.root + sep)) throw new Error('Invalid storage key');
    return target;
  }
}

/** Production: a private bucket on S3 or any S3-compatible service. */
class S3Driver implements StorageDriver {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async put(key: string, contents: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: contents,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!result.Body) throw new NotFoundException('Stored file not found');
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (error instanceof NoSuchKey) throw new NotFoundException('Stored file not found');
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

/**
 * Free hosting: file contents live in PostgreSQL, so no bucket or extra account is needed.
 * The organization id is the first part of every key, and deleting an organization removes
 * its files with it.
 */
class DatabaseDriver implements StorageDriver {
  constructor(private readonly prisma: PrismaService) {}

  async put(key: string, contents: Buffer, contentType?: string): Promise<void> {
    const organizationId = key.split('/')[0];
    await this.prisma.storedFile.create({
      data: {
        key,
        organizationId,
        contentType,
        size: contents.length,
        data: new Uint8Array(contents),
      },
    });
  }

  async get(key: string): Promise<Buffer> {
    const file = await this.prisma.storedFile.findUnique({
      where: { key },
      select: { data: true },
    });
    if (!file) throw new NotFoundException('Stored file not found');
    return Buffer.from(file.data);
  }

  async delete(key: string): Promise<void> {
    await this.prisma.storedFile.deleteMany({ where: { key } });
  }
}

/**
 * Files are addressed by a storage key ("orgId/uuid.pdf"). Callers never know which
 * driver is behind it, so switching to S3 is a configuration change only.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;

  constructor(config: ConfigService<Env, true>, prisma: PrismaService) {
    const driver = config.get('STORAGE_DRIVER', { infer: true });
    if (driver === 'database') {
      this.driver = new DatabaseDriver(prisma);
      this.logger.log('Storing files in the database');
    } else if (driver === 's3') {
      const accessKeyId = config.get('S3_ACCESS_KEY_ID', { infer: true });
      const secretAccessKey = config.get('S3_SECRET_ACCESS_KEY', { infer: true });
      const client = new S3Client({
        region: config.get('S3_REGION', { infer: true }),
        endpoint: config.get('S3_ENDPOINT', { infer: true }),
        forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
        // Without explicit keys the SDK uses the host's IAM role / default credential chain.
        credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
      });
      this.driver = new S3Driver(client, config.get('S3_BUCKET', { infer: true })!);
      this.logger.log(`Storing files in bucket "${config.get('S3_BUCKET', { infer: true })}"`);
    } else {
      this.driver = new LocalDriver(resolve(config.get('UPLOAD_DIR', { infer: true })));
    }
  }

  async save(
    organizationId: string,
    fileName: string,
    contents: Buffer,
    contentType?: string,
  ): Promise<string> {
    const key = `${organizationId}/${randomUUID()}${extname(fileName).toLowerCase()}`;
    await this.driver.put(key, contents, contentType);
    return key;
  }

  read(key: string): Promise<Buffer> {
    this.assertKey(key);
    return this.driver.get(key);
  }

  async remove(key: string): Promise<void> {
    this.assertKey(key);
    await this.driver.delete(key);
  }

  private assertKey(key: string): void {
    if (!key || key.includes('..') || key.startsWith('/')) throw new Error('Invalid storage key');
  }
}
