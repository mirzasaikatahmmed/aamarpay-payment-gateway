import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { AamarpayModule } from '../aamarpay/aamarpay.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Transaction]),
    AamarpayModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
