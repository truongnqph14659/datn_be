import {Body, Controller, Get, Param, ParseIntPipe, Put, Query, Req} from '@nestjs/common';
import {Request} from 'express';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {RequestReferencesService} from './request_references.service';

@Controller('request-references')
export class RequestReferencesController {
  constructor(private readonly requestReferencesService: RequestReferencesService) {}

  @Get()
  findAll(@Query() query: QuerySpecificationDto, @Req() req: Request) {
    return this.requestReferencesService.getRequestReferencesByUser({
      userId: req.user?.id,
      query,
    });
  }

  @Get('/unseen-count')
  getUnseenCount(@Req() req: Request) {
    const employeeId = req.user?.id;
    return this.requestReferencesService.countUnseenReferences(employeeId);
  }

  @Put(':id/mark-seen')
  async markAsSeen(@Param('id', ParseIntPipe) id: number, @Body() data: {employeeId: number}) {
    return this.requestReferencesService.markAsSeen(id, data.employeeId);
  }
}
