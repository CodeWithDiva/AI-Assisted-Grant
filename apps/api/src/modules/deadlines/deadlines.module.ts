import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesService } from './deadlines.service';
import { RemindersService } from './reminders.service';

@Module({
  controllers: [DeadlinesController, CronController],
  providers: [DeadlinesService, RemindersService],
  exports: [DeadlinesService],
})
export class DeadlinesModule {}
