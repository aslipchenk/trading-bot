export type OrderType = {
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  stopPrice?: number;
  timestamp: number;
  exchangeOrder?: any;
  closePosition?: string;
  priceProtect?: string;
  price?: number;
  timeInForce?: string;
};

export type SendRequestDtoType = {
  method: string;
  endpoint: string;
  data: Record<string, unknown>;
};
