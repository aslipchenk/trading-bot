import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TradeSessionModule } from './trade-session/trade-session.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BinanceModule } from './binance/binance.module';
import { OrdersModule } from './orders/orders.module';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsModule } from './jobs/jobs.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { OutboxModule } from './outbox/outbox.module';

const isTest = false;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: isTest ? '.env.test' : '.env.prod',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory(configService: ConfigService) {
        return {
          uri: configService.get('MONGO_URI'),
          useUnifiedTopology: true,
        };
      },
    }),
    TradeSessionModule,
    BinanceModule,
    OrdersModule,
    ScheduleModule.forRoot(),
    JobsModule,
    IndicatorsModule,
    OutboxModule,
    CacheModule.register({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
