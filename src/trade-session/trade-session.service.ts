import { StartupDtoType } from '../dto-types/startup.dto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TradeSessionDocument,
  TradeSession,
} from 'src/schemas/trade.session.schema';
import { DateTime } from 'luxon';
import { StatusEnum } from 'src/config/enums';

@Injectable()
export class TradeSessionService {
  constructor(
    @InjectModel(TradeSession.name)
    private tradeSessionModel: Model<TradeSessionDocument>,
  ) {}

  async checkIsThereActiveTradeSession() {
    const activeTradeSession = await this.findSessionInProgress();
    if (activeTradeSession) {
      throw new HttpException(
        `Trading session is already opened ${activeTradeSession.id}`,
        HttpStatus.CONFLICT,
      );
    }
  }

  findSessionInProgress() {
    return this.tradeSessionModel.findOne({
      status: StatusEnum.inProgress,
    });
  }

  async closeTradingSession() {
    const tradingSession = await this.findSessionInProgress();
    tradingSession.status = StatusEnum.finished;
    tradingSession.end = DateTime.now().toISO();
    return await tradingSession.save();
  }

  async createTradingSession({ pairs }: StartupDtoType): Promise<TradeSession> {
    await this.checkIsThereActiveTradeSession();
    try {
      const tradingSession = new this.tradeSessionModel({
        status: StatusEnum.inProgress,
        start: DateTime.now().toISO(),
        pairs,
      });
      return await tradingSession.save();
    } catch (e: any) {
      throw new HttpException(
        `Something went wrong when creating a trading session: ${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
