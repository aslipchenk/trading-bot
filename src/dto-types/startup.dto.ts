import {
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Pair {
  @IsString()
  name: string;

  @IsString()
  timeFrame: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  indicators: [string];
}

export class StartupDtoType {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => Pair)
  pairs: Pair[];
}
