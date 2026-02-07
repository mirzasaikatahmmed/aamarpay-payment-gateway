import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from './entities/payment.entity';
import { Transaction, TransactionType } from '../transaction/entities/transaction.entity';
import { AamarpayService } from '../aamarpay/aamarpay.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentStatus } from '../../common/enums';
import { AamarpayCallbackData } from '../aamarpay/interfaces/aamarpay.interface';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly appUrl: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly aamarpayService: AamarpayService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('app.url')!;
  }

  async initiatePayment(dto: CreatePaymentDto) {
    const transactionId = uuidv4().replace(/-/g, '').slice(0, 32);

    const payment = this.paymentRepo.create({
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      amount: parseFloat(dto.amount),
      currency: 'BDT',
      transactionId,
      description: 'Payment via aamarPay',
      status: PaymentStatus.INITIATED,
    });

    const saved = await this.paymentRepo.save(payment);

    const aamarpayResponse = await this.aamarpayService.initiatePayment({
      amount: dto.amount,
      transactionId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      description: 'Payment via aamarPay',
      successUrl: `${this.appUrl}/api/payments/success`,
      failUrl: `${this.appUrl}/api/payments/fail`,
      cancelUrl: `${this.appUrl}/api/payments/cancel`,
    });

    await this.transactionRepo.save(
      this.transactionRepo.create({
        type: TransactionType.PAYMENT,
        amount: parseFloat(dto.amount),
        merchantTrxId: transactionId,
        status: 'INITIATED',
        paymentId: saved.id,
        rawResponse: aamarpayResponse as any,
      }),
    );

    return { paymentUrl: aamarpayResponse.payment_url, paymentId: saved.id };
  }

  async handleSuccess(callbackData: AamarpayCallbackData) {
    this.logger.log(`Success callback data: ${JSON.stringify(callbackData)}`);
    const merchantTrxId = callbackData.mer_txnid;

    const payment = await this.paymentRepo.findOne({
      where: { transactionId: merchantTrxId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found for trx: ${merchantTrxId}`);
    }

    const verifyResponse = await this.aamarpayService.verifyPayment(merchantTrxId);
    this.logger.log(`Verify response: ${JSON.stringify(verifyResponse)}`);

    if (verifyResponse.status_code === '2') {
      payment.status = PaymentStatus.COMPLETED;
      payment.aamarpayTrxId = callbackData.pg_txnid;
      await this.paymentRepo.save(payment);

      await this.transactionRepo.save(
        this.transactionRepo.create({
          type: TransactionType.PAYMENT,
          amount: parseFloat(callbackData.amount),
          aamarpayTrxId: callbackData.pg_txnid,
          merchantTrxId,
          status: 'COMPLETED',
          paymentId: payment.id,
          rawResponse: verifyResponse as any,
        }),
      );

      return { success: true, payment };
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);
    return { success: false, payment };
  }

  async handleFail(callbackData: AamarpayCallbackData) {
    const merchantTrxId = callbackData.mer_txnid;

    const payment = await this.paymentRepo.findOne({
      where: { transactionId: merchantTrxId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        type: TransactionType.PAYMENT,
        amount: payment.amount,
        merchantTrxId,
        status: 'FAILED',
        paymentId: payment.id,
        rawResponse: callbackData as any,
      }),
    );

    return { success: false, payment };
  }

  async refundPayment(dto: RefundPaymentDto) {
    const payment = await this.paymentRepo.findOne({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refundableAmount = payment.amount - payment.refundedAmount;
    if (parseFloat(dto.amount) > refundableAmount) {
      throw new BadRequestException(
        `Refund amount exceeds refundable balance of ${refundableAmount} BDT`,
      );
    }

    payment.refundedAmount = Number(payment.refundedAmount) + parseFloat(dto.amount);
    payment.status =
      payment.refundedAmount >= payment.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await this.paymentRepo.save(payment);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        type: TransactionType.REFUND,
        amount: parseFloat(dto.amount),
        merchantTrxId: payment.transactionId,
        aamarpayTrxId: payment.aamarpayTrxId,
        status: 'REFUNDED',
        paymentId: payment.id,
        rawResponse: { reason: dto.reason, amount: dto.amount },
      }),
    );

    return {
      message: 'Refund processed successfully',
      refundedAmount: dto.amount,
      remainingRefundable: payment.amount - payment.refundedAmount,
    };
  }

  async getPaymentById(id: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['transactions'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getAllPayments(page = 1, limit = 20) {
    const [payments, total] = await this.paymentRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['transactions'],
    });

    return {
      payments: JSON.parse(JSON.stringify(payments)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionHistory(page = 1, limit = 20) {
    const [transactions, total] = await this.transactionRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['payment'],
    });

    return {
      transactions: JSON.parse(JSON.stringify(transactions)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
