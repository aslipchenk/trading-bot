import { BinanceModule } from './../binance/binance.module';
import { Outbox, OutboxSchema } from './../schemas/outbox.schema';
import { forwardRef, Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    forwardRef(() => BinanceModule),
    MongooseModule.forFeature([{ name: Outbox.name, schema: OutboxSchema }]),
  ],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
