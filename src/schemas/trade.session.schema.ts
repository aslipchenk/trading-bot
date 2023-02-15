import { Pair } from './../dto-types/startup.dto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { StatusEnum } from 'src/config/enums';

export type TradeSessionDocument = HydratedDocument<TradeSession>;

@Schema()
export class TradeSession {
  @Prop({ type: String, required: true, enum: StatusEnum })
  status: StatusEnum;

  @Prop({ type: Date, required: true })
  start: Date;

  @Prop({ type: [Object], required: true })
  pairs: [Pair];

  @Prop({ type: Date })
  end: Date;
}

export const TradeSessionSchema = SchemaFactory.createForClass(TradeSession);
