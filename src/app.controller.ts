import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { StartupDtoType } from 'src/dto-types/startup.dto';

@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('ok')
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('start')
  startup(@Body() startupDto: StartupDtoType) {
    return this.appService.startup(startupDto);
  }

  @Post('finish')
  finish() {
    return this.appService.finish();
  }
}
