import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AamarpayInitResponse,
  AamarpayVerifyResponse,
} from './interfaces/aamarpay.interface';

@Injectable()
export class AamarpayService {
  private readonly logger = new Logger(AamarpayService.name);

  private readonly baseUrl: string;
  private readonly storeId: string;
  private readonly signatureKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('aamarpay.baseUrl')!;
    this.storeId = this.configService.get<string>('aamarpay.storeId')!;
    this.signatureKey = this.configService.get<string>('aamarpay.signatureKey')!;
  }

  async initiatePayment(params: {
    amount: string;
    transactionId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    description: string;
    successUrl: string;
    failUrl: string;
    cancelUrl: string;
  }): Promise<AamarpayInitResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('store_id', this.storeId);
      formData.append('signature_key', this.signatureKey);
      formData.append('tran_id', params.transactionId);
      formData.append('amount', params.amount);
      formData.append('currency', 'BDT');
      formData.append('desc', params.description || 'Payment');
      formData.append('cus_name', params.customerName);
      formData.append('cus_email', params.customerEmail);
      formData.append('cus_phone', params.customerPhone);
      formData.append('cus_add1', 'N/A');
      formData.append('cus_city', 'N/A');
      formData.append('cus_country', 'Bangladesh');
      formData.append('success_url', params.successUrl);
      formData.append('fail_url', params.failUrl);
      formData.append('cancel_url', params.cancelUrl);
      formData.append('type', 'json');
      formData.append('opt_a', params.transactionId);

      const { data } = await firstValueFrom(
        this.httpService.post<AamarpayInitResponse>(
          `${this.baseUrl}/index.php`,
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      if (data.result !== 'true') {
        this.logger.error('aamarPay response', JSON.stringify(data));
        throw new Error('Payment initiation failed');
      }

      return data;
    } catch (error: any) {
      this.logger.error('Initiate payment failed', error.response?.data || error.message);
      throw new HttpException(
        error.message || 'Failed to initiate aamarPay payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async verifyPayment(transactionId: string): Promise<AamarpayVerifyResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<AamarpayVerifyResponse>(
          `${this.baseUrl}/api/v1/trxcheck/request.php`,
          {
            params: {
              request_id: transactionId,
              store_id: this.storeId,
              signature_key: this.signatureKey,
              type: 'json',
            },
          },
        ),
      );

      return data;
    } catch (error: any) {
      this.logger.error('Verify payment failed', error.message);
      throw new HttpException(
        'Failed to verify aamarPay payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
