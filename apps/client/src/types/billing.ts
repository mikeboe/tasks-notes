export type Invoice = {
  id: string;
  amountDue: number;
  amountPaid: number;
  paid: boolean;
  date: Date;
  hostedInvoiceUrl: string | null | undefined;
  invoicePdf: string | null | undefined;
};
