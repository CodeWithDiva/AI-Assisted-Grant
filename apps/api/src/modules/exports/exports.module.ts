import { Module } from '@nestjs/common';
import { DocumentBuilderService } from './document-builder.service';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, DocumentBuilderService],
  exports: [ExportsService],
})
export class ExportsModule {}
