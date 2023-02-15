import { OutboxModule } from './../outbox/outbox.module';
import { ConfigService } from '@nestjs/config';
import { forwardRef, Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import {
  MainClient,
  USDMClient,
  WebsocketClient,
  DefaultLogger,
} from 'binance';
import { BinanceController } from './binance.controller';

DefaultLogger.silly = (...params) => {};

@Module({
  imports: [forwardRef(() => OutboxModule)],
  providers: [
    BinanceService,
    {
      provide: 'MAIN_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new MainClient({
          api_key: configService.get('BINANCE_API_KEY'),
          api_secret: configService.get('BINANCE_API_SECRET'),
          baseUrl: configService.get('BINANCE_API_URL'),
        });
      },
    },
    {
      provide: 'USD_M_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new USDMClient({
          api_key: configService.get('BINANCE_API_KEY'),
          api_secret: configService.get('BINANCE_API_SECRET'),
          baseUrl: configService.get('BINANCE_API_URL'),
        });
      },
    },
    {
      provide: 'WS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const wsClient = new WebsocketClient({
          api_key: configService.get('BINANCE_API_KEY'),
          api_secret: configService.get('BINANCE_API_SECRET'),
          beautify: true,
          requestOptions: { baseURL: configService.get('BINANCE_API_URL') },
        });
        return wsClient;
      },
    },
  ],
  controllers: [BinanceController],
  exports: [BinanceService],
})
export class BinanceModule {}
