import { AnyAmount } from "./Amount";

export interface TransactionTemplate {
  Flags?: number;
  Fee?: string;
  SourceTag?: number;
  Memos?: Array<TransactionMemo>;
}

export interface TransactionMemo {
  Memo: {
    MemoData?: string;
    MemoFormat?: string;
    MemoType?: string;
  };
}

export interface PaymentTransactionDetails {
  TransactionType: "Payment";
  Amount: AnyAmount;
  Destination: string;
  DestinationTag?: number;
  InvoiceID?: string;
  SendMax?: AnyAmount;
  DeliverMin?: AnyAmount;
}

export interface EscrowCreateDetails {
  TransactionType: "EscrowCreate";
  Amount: string;
  Destination: string;
  DestinationTag?: number;
  CancelAfter?: number;
  FinishAfter?: number;
  Condition?: string;
}

export interface AccountSetDetails {
  TransactionType: "AccountSet";
  ClearFlag?: number;
  Domain?: string;
  EmailHash?: string;
  MessageKey?: string;
  SetFlag?: number;
  TransferRate?: number;
  TickSize?: number;
}

export declare type TransactionDetails =
  | PaymentTransactionDetails
  | EscrowCreateDetails
  | AccountSetDetails;

export declare type Transaction = TransactionTemplate & TransactionDetails;
