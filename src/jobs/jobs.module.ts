import { ConfigService } from '@nestjs/config';
import { OrdersModule } from './../orders/orders.module';
import { IndicatorsModule } from './../indicators/indicators.module';
import { BinanceModule } from './../binance/binance.module';
import { Module } from '@nestjs/common';
import { TradeSessionModule } from 'src/trade-session/trade-session.module';
import { JobsService } from './jobs.service';
import * as TelegramBot from 'node-telegram-bot-api';

@Module({
  imports: [TradeSessionModule, BinanceModule, IndicatorsModule, OrdersModule],
  providers: [
    JobsService,
    {
      provide: 'TELEGRAM_SERVICE',
      useFactory: async (configService: ConfigService) => {
        const token = configService.get('TELEGRAM_BOT_API_KEY');
        const bot = new TelegramBot(token);
        return bot;
      },
      inject: [ConfigService],
    },
  ],
})
export class JobsModule {}
