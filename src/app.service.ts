import { StartupDtoType } from './dto-types/startup.dto';
import { Inject, Injectable } from '@nestjs/common';
import { TradeSessionService } from 'src/trade-session/trade-session.service';

@Injectable()
export class AppService {
  constructor(@Inject(TradeSessionService) private tradeSessionService) {}

  getHello(): string {
    return 'Hello World!';
  }

  startup(startupDto: StartupDtoType) {
    return this.tradeSessionService.createTradingSession(startupDto);
  }

  finish() {
    return this.tradeSessionService.closeTradingSession();
  }
}
