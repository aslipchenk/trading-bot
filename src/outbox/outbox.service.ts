import { MAX_RETRY_ATTEMPTS } from './../config/constants';
import { OutboxStatusesEnum } from 'src/config/enums';
import { BinanceService } from './../binance/binance.service';
import { Outbox, OutboxDocument } from './../schemas/outbox.schema';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OutboxService {
  constructor(
    @InjectModel(Outbox.name)
    private outboxModel: Model<OutboxDocument>,
    @Inject(forwardRef(() => BinanceService))
    private exchangeService: BinanceService,
  ) {}

  createOutbox(dto) {
    const newOutbox = new this.outboxModel(dto);
    return newOutbox.save();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkOutboxCollection() {
    const brokenModels = await this.outboxModel.find({
      status: OutboxStatusesEnum.failed,
    });
    for (const model of brokenModels) {
      if (model.retryAttempts > MAX_RETRY_ATTEMPTS) {
        model.status = OutboxStatusesEnum.broken;
        await model.save();
      } else {
        try {
          const requestDto = {
            endpoint: model.endpoint,
            data: model.data,
            method: model.method,
          };
          await this.exchangeService.sendRequest(requestDto);
        } catch (e) {
          if (e) {
            if (typeof e === 'object') model.log = JSON.stringify(e);
            else model.log = e;
          }
          model.retryAttempts++;
          await model.save();
        }
      }
    }
  }
}
