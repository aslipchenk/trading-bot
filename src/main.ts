import { ValidationPipe } from './pipes/validation.pipe';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT);
  //wtf without that line nest js is stops working on each unhandled exception
  process.on('unhandledRejection', (reason, promise) => {
    console.log(reason, promise);
  });
}
bootstrap();
