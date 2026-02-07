export interface AamarpayInitResponse {
  result: string;
  payment_url: string;
}

export interface AamarpayVerifyResponse {
  pg_txnid: string;
  mer_txnid: string;
  risk_title: string;
  risk_level: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
  cus_add1: string;
  cus_add2: string;
  cus_city: string;
  cus_state: string;
  cus_postcode: string;
  cus_country: string;
  amount: string;
  amount_original: string;
  amount_currency: string;
  pay_status: string;
  status_code: string;
  status_title: string;
  cardnumber: string;
  approval_code: string;
  payment_type: string;
  bank_txn: string;
  payment_processor: string;
  rec_amount: string;
  processing_charge: string;
  opt_a: string;
  opt_b: string;
  opt_c: string;
  opt_d: string;
  currency: string;
  currency_merchant: string;
  convertion_rate: string;
  ip_address: string;
  other_currency: string;
  pg_card_risklevel: string;
  pg_error_code_details: string;
  date: string;
}

import { Allow } from 'class-validator';

export class AamarpayCallbackData {
  @Allow() pay_status: string;
  @Allow() cus_name: string;
  @Allow() cus_phone: string;
  @Allow() cus_email: string;
  @Allow() currency: string;
  @Allow() pay_time: string;
  @Allow() amount: string;
  @Allow() mer_txnid: string;
  @Allow() pg_txnid: string;
  @Allow() bank_txn: string;
  @Allow() card_type: string;
  @Allow() status_code: string;
  @Allow() opt_a: string;
  @Allow() opt_b: string;
  @Allow() opt_c: string;
  @Allow() opt_d: string;
}
