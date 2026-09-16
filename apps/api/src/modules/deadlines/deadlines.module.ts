import { Module } from '@nestjs/common';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesService } from './deadlines.service';
import { RemindersService } from './reminders.service';

@Module({
  controllers: [DeadlinesController],
  providers: [DeadlinesService, RemindersService],
  exports: [DeadlinesService],
})
export class DeadlinesModule {}
