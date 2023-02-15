import { Order, OrderSchema } from './../schemas/orders.schema';
import { BinanceModule } from './../binance/binance.module';
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    BinanceModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
