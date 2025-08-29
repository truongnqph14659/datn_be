import {Controller, Post, Body, Req, UseInterceptors} from '@nestjs/common';
import {CheckInOutService} from './check-in-out.service';
import {CreateCheckInOutDto} from './dto/create-check-in-out.dto';
import {ApiTags} from '@nestjs/swagger';
import {AnyFilesInterceptor} from '@nestjs/platform-express';
import {IsSkipAuth} from '../auth/is-skip-auth.decorator';
import { sendCheckInOutData } from 'src/utils/fake-data';

@ApiTags('check-in-out')
@Controller('check-in-out')
export class CheckInOutController {
  constructor(private readonly checkInOutService: CheckInOutService) {}

  @IsSkipAuth()
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  create(@Body() createCheckInOutDto: CreateCheckInOutDto, @Req() req: Request) {
    return this.checkInOutService.create(createCheckInOutDto, req);
  }

  @IsSkipAuth()
  @Post('fake-data')
  random(@Body() createCheckInOutData: any) {
    return sendCheckInOutData(createCheckInOutData)
  }
}
