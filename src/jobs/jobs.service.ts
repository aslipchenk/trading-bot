import {
  DEFAULT_BTC_QUANTITY,
  DEFAULT_THROTTLE_TICKS_SKIP,
  MAX_BALANCE_RISK_PERCENT,
} from './../config/constants';
import { Pair } from './../dto-types/startup.dto';
import { OrdersService } from './../orders/orders.service';
import { IndicatorsService } from './../indicators/indicators.service';
import { BinanceService } from './../binance/binance.service';
import { TradeSessionService } from 'src/trade-session/trade-session.service';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IndicatorsEnum, StatusEnum, SidesEnum } from 'src/config/enums';
import TelegramBot from 'node-telegram-bot-api';
import { KlineInterval } from 'binance';

@Injectable()
export class JobsService implements OnModuleInit {
  shouldCheckAmplitude: boolean;
  session: any;
  throttleCounter: number;
  trendChangeThrottle: number;
  constructor(
    @Inject(TradeSessionService)
    private tradeSessionService: TradeSessionService,
    @Inject(BinanceService) private exchangeService: BinanceService,
    @Inject(IndicatorsService) private indicatorsService: IndicatorsService,
    @Inject(OrdersService) private ordersService: OrdersService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('TELEGRAM_SERVICE') private telegramService: TelegramBot,
  ) {
    this.shouldCheckAmplitude = true;
    this.throttleCounter = 0;
    this.trendChangeThrottle = 0;
  }

  async checkTrend(dbOrder, rsiResult: number, marketData): Promise<boolean> {
    const isTrendChanged = this.indicatorsService.checkRSITrendChange(
      dbOrder,
      rsiResult,
    );
    if (isTrendChanged && !this.trendChangeThrottle) {
      this.trendChangeThrottle = 5;
      await this.handleTrendChange(dbOrder, marketData);
      setTimeout(() => {
        this.trendChangeThrottle = 0;
      }, 5000);
    }
    return isTrendChanged;
  }

  async handleKLineTickerUpdate(message) {
    const session =
      this.session || (await this.tradeSessionService.findSessionInProgress());
    if (!session) return;
    if (!this.session) this.session = session;
    if (message.wsKey === `usdm_kline_btcusdt_${session.pairs[0].timeFrame}`) {
      const kLine = message.k;
      const currentPrice = kLine.c;
      const dbOrder = await this.ordersService.getOrderByStatusAndIndicator(
        IndicatorsEnum.RSI,
      );
      const marketData = await this.cacheManager.get<any>('marketData');
      if (!marketData) return;
      marketData.close.pop();
      marketData.close.push(currentPrice);
      const rsiResult = this.indicatorsService.RSI(marketData.close);
      const order = this.indicatorsService.getRSIOrderResult(
        rsiResult,
        +marketData.close.at(-1),
      );
      const isTrendChanged = await this.checkTrend(
        dbOrder,
        rsiResult,
        marketData,
      );
      if (isTrendChanged) {
        return;
      }
      // TODO: Temporary
      const shouldOpenMore = true;
      // (rsiResult > 90 || rsiResult < 15) && !dbOrder.isOpenedMore;
      if (this.shouldCheckAmplitude) {
        this.checkAmplitude(kLine, dbOrder);
      }
      if (dbOrder) return dbOrder;
      if (!order) return;
      const quantity = DEFAULT_BTC_QUANTITY;
      if (this.throttleCounter) {
        this.throttleCounter--;
        return;
      }
      this.throttleCounter = DEFAULT_THROTTLE_TICKS_SKIP;
      await this.ordersService.createOrder(
        {
          ...order,
          pair: session.pairs[0].name,
          quantity,
          isOpenedMore: shouldOpenMore,
        },
        session.id,
      );
      this.telegramService
        .sendMessage(
          367877038,
          `New order is opened - > \n\n${JSON.stringify(order, null, 2)}\n\n`,
        )
        .catch((e) => console.error(e));
    }
  }

  checkAmplitude(kLine, order) {
    const high = +kLine.h;
    const low = +kLine.l;
    const amplitude = this.getAmplitude(high, low);
    const percentageAmplitude = this.getPercentageAmplitude(amplitude, high);
    if (!order || percentageAmplitude < 0.4) return;
    const profit = this.getProfit(order, +kLine.c);
    if (profit > 0) {
    }
  }

  openMore() {}

  getProfit(order, currentPrice) {
    if (order.side === 'LONG') {
      return currentPrice - +order.value;
    }
    return +order.value - currentPrice;
  }

  getPercentageAmplitude(amplitude: number, high: number): number {
    return +((amplitude / high) * 100).toFixed(2);
  }
  getAmplitude(high: number, low: number): number {
    return high - low;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateMarketData() {
    const session = await this.tradeSessionService.findSessionInProgress();
    if (!session) return;
    // TODO: don't hardcode that data
    const name = session.pairs[0].name;
    const timeFrame = session.pairs[0].timeFrame;
    const historicals = await this.exchangeService.getHistoricals(
      name,
      timeFrame,
    );
    const marketData = this.indicatorsService.getMarketData(historicals);
    await this.cacheManager.set('marketData', marketData, 0);
  }

  async subscribeOnFuturesUpdates() {
    await this.exchangeService.subscribeOnUserFuturesMessages(
      async (message: any) => {
        this.handleKLineTickerUpdate(message);
        if (
          message.e === 'ORDER_TRADE_UPDATE' &&
          message.o.o === 'MARKET' &&
          +message.o.rp
        ) {
          const order = await this.ordersService.getOrderByStatusAndIndicator(
            IndicatorsEnum.RSI,
          );
          if (order?.status === StatusEnum.inProgress) {
            await this.exchangeService.cancelAllOrders(order.pair);
            await this.ordersService.updateOrderStatus(
              order.id,
              StatusEnum.finished,
            );
            await this.cacheManager.del(order.indicator.name);
          }
        }
      },
    );
  }

  async subscribeOnMarketData() {
    const session = await this.tradeSessionService.findSessionInProgress();
    if (!session) return;
    const pairName = session.pairs[0].name;
    const timeFrame = session.pairs[0].timeFrame;
    return this.exchangeService.subscribeKlines(
      pairName,
      timeFrame as KlineInterval,
    );
  }

  async onModuleInit() {
    await this.updateMarketData();
    await this.subscribeOnFuturesUpdates();
    await this.subscribeOnMarketData();
  }

  async calculateQuantity(currentAssetPrice: number): Promise<number> {
    const balance = await this.exchangeService.balance();
    const usdtBalance = +balance.find((bal) => bal.asset === 'USDT')
      .availableBalance;
    const buyValue = (usdtBalance / 100) * MAX_BALANCE_RISK_PERCENT;
    const quantity = buyValue / currentAssetPrice;
    return +quantity.toFixed(3);
  }

  async handleTrendChange(dbOrder, marketData) {
    if (
      (dbOrder.side === SidesEnum.SHORT &&
        +dbOrder.value < +marketData.close.at(-1)) ||
      (dbOrder.side === SidesEnum.LONG &&
        +dbOrder.value > +marketData.close.at(-1))
    ) {
    }
    return await this.ordersService.closeOrder(dbOrder);
  }

  async mountPair(pair: Pair, sessionId: string) {
    const historicals = await this.exchangeService.getHistoricals(
      pair.name,
      pair.timeFrame,
    );
    const dbOrder = await this.ordersService.getOrderByStatusAndIndicator(
      IndicatorsEnum.RSI,
    );
    const quantityPromise = this.calculateQuantity(+historicals.at(-1)[4]);
    const marketData = this.indicatorsService.getMarketData(historicals);
    const result = this.indicatorsService.RSI(marketData.close, {});
    const order = this.indicatorsService.getRSIOrderResult(
      result,
      +marketData.close.at(-1),
    );
    const isTrendChanged = this.indicatorsService.checkRSITrendChange(
      dbOrder,
      result,
    );
    if (isTrendChanged) {
      return this.handleTrendChange(dbOrder, marketData);
    }
    if (dbOrder) return dbOrder;
    if (!order) return;
    const quantity = await quantityPromise;
    return await this.ordersService.createOrder(
      { ...order, pair: pair.name, quantity },
      sessionId,
    );
  }

  // @Cron(CronExpression.EVERY_HOUR)
  async closeLongTrades() {
    const session = await this.tradeSessionService.findSessionInProgress();
    if (!session) return;
    const ordersInProgress = await this.ordersService.getOrdersInProgress();
    const promises = [];
    for (const order of ordersInProgress) {
      if (
        order.start &&
        new Date().getTime() - new Date(order.start).getTime() >
          1000 * 60 * 60 * 3
      ) {
        promises.push(this.ordersService.closeOrder(order));
      }
    }
    await Promise.all(promises);
  }

  // @Cron(CronExpression.EVERY_10_SECONDS)
  async checkChart() {
    const session = await this.tradeSessionService.findSessionInProgress();
    if (!session) return;
    const promises = [];
    for (const pair of session.pairs) {
      promises.push(this.mountPair(pair, session.id));
    }
    await Promise.all(promises);
  }
}
