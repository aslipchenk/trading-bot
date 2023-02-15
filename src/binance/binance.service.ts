import { OutboxService } from './../outbox/outbox.service';
import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  forwardRef,
} from '@nestjs/common';
import {
  KlineInterval,
  MainClient,
  USDMClient,
  WebsocketClient,
} from 'binance';
import { createHmac } from 'crypto';
import * as qs from 'qs';
import { OrderType, SendRequestDtoType } from 'src/binance/types';

@Injectable()
export class BinanceService {
  isTestnet: boolean;
  constructor(
    @Inject('MAIN_CLIENT') private mainClient: MainClient,
    @Inject('USD_M_CLIENT') private usdMClient: USDMClient,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject('WS_CLIENT') private wsClient: WebsocketClient,
    @Inject(forwardRef(() => OutboxService))
    private outboxService: OutboxService,
  ) {
    this.isTestnet = this.configService
      .get('BINANCE_API_URL')
      .includes('testnet');
  }

  sendRequest({ data, method = 'post', endpoint }: SendRequestDtoType) {
    return this.usdMClient[method](endpoint, data);
  }

  async subscribeOnUserFuturesMessages(subsCallback) {
    this.wsClient.on('message', subsCallback);
    await this.wsClient.subscribeUsdFuturesUserDataStream(this.isTestnet);
  }

  async subscribeKlines(
    symbol: string,
    interval: KlineInterval,
    market = 'usdm',
  ) {
    if (this.isTestnet) {
      return this.wsClient.connectToWsUrl(
        `wss://stream.binancefuture.com/ws/btcusdt@kline_${interval}`,
        'usdm_kline_btcusdt_15m',
      );
    }
    return await this.wsClient.subscribeKlines(symbol, interval, 'usdm');
  }

  async time() {
    return this.usdMClient.getServerTime();
  }

  async balance() {
    return this.usdMClient.getBalance();
  }

  async testConnectivity() {
    return this.usdMClient.testConnectivity();
  }

  async getHistoricals(symbol: string, interval: string) {
    return this.usdMClient.get('fapi/v1/klines', {
      symbol,
      interval,
    });
  }

  exchangeInfo() {
    return this.usdMClient.getExchangeInfo();
  }

  buildSign(data) {
    // actual node js querystring is not working for nested objects in arrays
    const searchParams = qs.stringify(data);
    return createHmac('sha256', this.configService.get('BINANCE_API_SECRET'))
      .update(searchParams)
      .digest('hex');
  }

  async closeOrder(symbol: string, orderId: number) {
    let orders = [];
    let positions = [];
    try {
      positions = await this.usdMClient.getPositions({ symbol });
      orders = await this.usdMClient.getAllOrders({ symbol });
    } catch (e) {
      console.error(e);
      throw new HttpException(
        'Get orders array failed',
        HttpStatus.BAD_REQUEST,
      );
    }
    const orderToClose = orders.find(
      ({ orderId: _orderId }) => _orderId === orderId,
    );
    if (orderToClose?.status === 'FILLED') {
      if (positions.length && +positions[0].positionAmt) {
        const data = {
          symbol,
          side: orderToClose.side === 'BUY' ? 'SELL' : 'BUY',
          type: 'MARKET',
          timestamp: Date.now(),
          quantity:
            +positions[0].positionAmt < 0
              ? -+positions[0].positionAmt
              : positions[0].positionAmt,
          newOrderRespType: 'RESULT',
        };
        const signature = this.buildSign(data);

        await this.usdMClient.post('fapi/v1/order', {
          ...data,
          signature,
        });
      }
      await this.cancelAllOrders(symbol);
      const trades = await this.usdMClient.getAccountTrades({ symbol });
      const trade = trades.find(
        ({ orderId: _orderId }) => _orderId === orderId,
      );
      return { ...orderToClose, profit: +trade.realizedPnl };
    }
  }

  cancelAllOrders(symbol: string) {
    const dto = { symbol, timestamp: Date.now() };
    const cancelOrderSign = this.buildSign(dto);
    return this.usdMClient.delete('fapi/v1/allOpenOrders', {
      ...dto,
      signature: cancelOrderSign,
    });
  }

  connectToChart() {}

  async limitOrder(params) {
    const { pair, side, quantity, value } = params;
    const order: OrderType = {
      symbol: pair,
      side: side === 'LONG' ? 'BUY' : 'SELL',
      type: 'LIMIT',
      quantity,
      timestamp: Date.now(),
      price: value,
      timeInForce: 'GTC',
    };
    const signature = this.buildSign(order);
    return await this.usdMClient.post('fapi/v1/order', {
      ...order,
      signature,
    });
  }

  async orderWithTPAndSP(params: any) {
    const quantity = params.quantity;
    const timestamp = Date.now();
    const data: OrderType = {
      symbol: params.pair,
      side: params.side === 'LONG' ? 'BUY' : 'SELL',
      type: 'LIMIT',
      quantity,
      timestamp,
      price: params.side === 'LONG' ? params.value + 1 : params.value - 1,
      timeInForce: 'GTC',
    };
    // const takeProfit: OrderType = {
    //   symbol: params.pair,
    //   side: params.side === 'LONG' ? 'SELL' : 'BUY',
    //   type: 'TAKE_PROFIT_MARKET',
    //   quantity,
    //   stopPrice: params.takeProfit.toFixed(0),
    //   timestamp,
    //   closePosition: 'true',
    //   priceProtect: 'true',
    // };
    const stopLoss: OrderType = {
      symbol: params.pair,
      side: params.side === 'LONG' ? 'SELL' : 'BUY',
      type: 'STOP_MARKET',
      closePosition: 'true',
      quantity,
      stopPrice: params.stopLoss.toFixed(0),
      timestamp,
      priceProtect: 'true',
    };
    const batchOrders = [data, stopLoss];
    //TODO: should be handled as a batch orders but there is an issue with signature of nested arrays
    const promises = [];
    for (const order of batchOrders) {
      const signature = this.buildSign(order);
      promises.push(
        this.usdMClient.post('fapi/v1/order', {
          ...order,
          signature,
        }),
      );
    }
    const resolved = await Promise.all(promises);
    return resolved[0];

    // return this.usdMClient.post(`fapi/v1/batchOrders`, {
    //   ...dto,
    //   signature,
    // });
  }
}
