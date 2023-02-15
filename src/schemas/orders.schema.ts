import { TradeSession } from 'src/schemas/trade.session.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { StatusEnum } from 'src/config/enums';

export type OrderDocument = HydratedDocument<Order>;

type IndicatorType = {
  name: string;
  data: Record<string, unknown>;
};

@Schema()
export class Order {
  @Prop({ type: String, required: true, enum: StatusEnum })
  status: StatusEnum;

  @Prop({ type: Date, required: true })
  start: Date;

  @Prop({ type: String, required: true })
  pair: string;

  @Prop({ type: Number })
  profit: number;

  @Prop({ type: Object, required: true })
  indicator: IndicatorType;

  @Prop({ type: String, required: true })
  side: string;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: String })
  stopLoss: string;

  @Prop({ type: String })
  takeProfit: string;

  @Prop({ type: Date })
  end: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'TradeSession' })
  tradeSession: TradeSession;

  @Prop({ type: Boolean, default: false })
  isOpenedMore: boolean;

  @Prop({ type: Object })
  exchangeOrder: Record<string, unknown>;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
