import { DateTime } from 'luxon';
import {
  CacheKey,
  CacheTTL,
  CACHE_MANAGER,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Order, OrderDocument } from 'src/schemas/orders.schema';
import { StatusEnum } from 'src/config/enums';
import { BinanceService } from './../binance/binance.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(BinanceService) private exchangeService: BinanceService,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getOrderByStatusAndIndicator(indicator: string) {
    const fromCache = await this.cacheManager.get<Order & { id: string }>(
      indicator,
    );
    if (fromCache) return fromCache;

    const order = await this.orderModel.findOne({
      status: StatusEnum.inProgress,
      'indicator.name': indicator,
    });

    if (order) await this.cacheManager.set(indicator, order, 0);
    return order;
  }

  getOrdersInProgress() {
    return this.orderModel.find({ status: StatusEnum.inProgress });
  }

  getOrderByParams(params: any) {
    return this.orderModel.findOne(params);
  }

  async closeOrder(order: Order & { id?: string }) {
    const exchangeOrder = await this.exchangeService.closeOrder(
      order.pair,
      order.exchangeOrder.orderId as number,
    );
    await this.cacheManager.del(order.indicator.name);
    return await this.orderModel.findByIdAndUpdate(order.id, {
      status: StatusEnum.finished,
      profit: exchangeOrder?.profit,
    });
  }

  updateOrderStatus(orderId: string, status: string) {
    return this.orderModel.findByIdAndUpdate(orderId, {
      status,
    });
  }

  async createOrder(order: any, sessionId: string) {
    const exchangeOrder = await this.exchangeService.orderWithTPAndSP(order);
    const newOrder = new this.orderModel({
      tradeSession: sessionId,
      status: StatusEnum.inProgress,
      start: DateTime.now().toISO(),
      exchangeOrder,
      ...order,
    });
    await this.cacheManager.set(newOrder.indicator.name, newOrder, 0);
    try {
      const ord = await newOrder.save();
    } catch (e) {
      console.error(e);
    }
  }
}
