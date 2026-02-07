import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AamarpayService } from './aamarpay.service';

@Module({
  imports: [HttpModule],
  providers: [AamarpayService],
  exports: [AamarpayService],
})
export class AamarpayModule {}
