import { BinanceService } from './binance.service';
import { Controller, Get, Inject } from '@nestjs/common';

@Controller('binance')
export class BinanceController {
  constructor(@Inject(BinanceService) private binanceService: BinanceService) {}
  @Get('balance')
  balance() {
    return this.binanceService.balance();
  }

  @Get('testConnectivity')
  testConnectivity() {
    return this.binanceService.testConnectivity();
  }

  @Get('getHistoricals')
  getHistoricals() {
    // return this.binanceService.getHistoricals();
  }

  @Get('exchangeInfo')
  exchangeInfo() {
    return this.binanceService.exchangeInfo();
  }
}
