import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { TradeSessionService } from './trade-session.service';
import {
  TradeSessionSchema,
  TradeSession,
} from 'src/schemas/trade.session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TradeSession.name, schema: TradeSessionSchema },
    ]),
  ],
  providers: [TradeSessionService],
  exports: [TradeSessionService],
})
export class TradeSessionModule {}
