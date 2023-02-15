import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OutboxStatusesEnum } from 'src/config/enums';

export type OutboxDocument = HydratedDocument<Outbox>;

@Schema()
export class Outbox {
  @Prop({
    type: String,
    enum: OutboxStatusesEnum,
    default: OutboxStatusesEnum.failed,
  })
  status: OutboxStatusesEnum;

  @Prop({ type: String, required: true })
  endpoint: string;

  @Prop({ type: String, required: true })
  method: string;

  @Prop({ type: Number, default: 0 })
  retryAttempts: number;

  @Prop({ type: Object, required: true })
  data: Record<string, unknown>;

  @Prop({ type: String })
  log: string;
}

export const OutboxSchema = SchemaFactory.createForClass(Outbox);
