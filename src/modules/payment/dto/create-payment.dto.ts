import { IsNotEmpty, IsString, IsNumberString, IsEmail, Matches } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @IsNotEmpty()
  @IsEmail()
  customerEmail: string;

  @IsNotEmpty()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Please provide a valid Bangladeshi phone number',
  })
  customerPhone: string;

  @IsNotEmpty()
  @IsNumberString()
  amount: string;
}
