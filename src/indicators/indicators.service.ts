import { StatusEnum } from 'src/config/enums';
import { Injectable } from '@nestjs/common';
import * as talib from 'ta-lib';
import { SidesEnum, IndicatorsEnum } from 'src/config/enums';
import { RSI, FasterRSI } from 'trading-signals';

@Injectable()
export class IndicatorsService {
  private talib: any;
  constructor() {
    this.talib = talib;
  }
  checkRSITrendChange(order, lastRSIValue: number) {
    if (!order) return false;
    if (lastRSIValue > 50 && order.side === SidesEnum.LONG) return true;
    if (lastRSIValue < 50 && order.side === SidesEnum.SHORT) return true;
    return false;
  }

  calculateExpectedProfit(currentPrice: number, side: string) {
    if (side === SidesEnum.LONG) {
      return currentPrice + (currentPrice / 100) * 0.2;
    }
    if (side === SidesEnum.SHORT) {
      return currentPrice - (currentPrice / 100) * 0.2;
    }
  }

  calculateExpectedLoss(currentPrice: number, side: string) {
    if (side === SidesEnum.LONG) {
      return currentPrice - (currentPrice / 100) * 0.75;
    }
    if (side === SidesEnum.SHORT) {
      return currentPrice + (currentPrice / 100) * 0.75;
    }
  }

  getRSIOrderResult(result: number, currentPrice: number) {
    if (result < 20) {
      return {
        indicator: { name: IndicatorsEnum.RSI, data: { value: result } },
        status: StatusEnum.inProgress,
        side: SidesEnum.LONG,
        value: currentPrice,
        takeProfit: this.calculateExpectedProfit(currentPrice, SidesEnum.LONG),
        stopLoss: this.calculateExpectedLoss(currentPrice, SidesEnum.LONG),
      };
    }
    if (result > 80) {
      return {
        indicator: { name: IndicatorsEnum.RSI, data: { value: result } },
        status: StatusEnum.inProgress,
        side: SidesEnum.SHORT,
        value: currentPrice,
        takeProfit: this.calculateExpectedProfit(currentPrice, SidesEnum.SHORT),
        stopLoss: this.calculateExpectedLoss(currentPrice, SidesEnum.SHORT),
      };
    }

    return null;
  }

  getMarketData(historicals) {
    return historicals.reduce(
      (accum, next) => {
        accum.close.push(next[4]);
        return accum;
      },
      { close: [] },
    );
  }

  SMA(close) {
    return this.talib.SMA(close, 30);
  }

  RSI(close, options: any = {}) {
    const rsi = new FasterRSI(6);
    close.forEach((num) => {
      rsi.update(num);
    });
    return rsi.getResult();
  }
}
