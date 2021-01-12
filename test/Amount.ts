export interface IssuedAmount {
  currency: string;
  issuer: string;
  value: string;
}

export declare type NativeAmount = string;
export declare type AnyAmount = NativeAmount | IssuedAmount;
