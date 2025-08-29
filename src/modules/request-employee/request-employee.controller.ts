import {Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {Request} from 'express';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {CreateRequestEmployeeDto} from './dto/create-request-employee.dto';
import {RequestEmployeeService} from './request-employee.service';

@ApiTags('request-employee')
@Controller('request-employee')
export class RequestEmployeeController {
  constructor(private readonly requestEmployeeService: RequestEmployeeService) {}

  @Post()
  create(@Body() createRequestEmployeeDto: CreateRequestEmployeeDto) {
    return this.requestEmployeeService.create(createRequestEmployeeDto);
  }

  @Post('/cancel')
  cancelRequest(@Body() payload: {requestEmpId: number; employeeId: number}) {
    return this.requestEmployeeService.cancelRequest(payload);
  }

  @Post('/reject')
  rejectRequest(@Body() payload: {requestEmpId: number; employeeId: number;appover_feaback: string}) {
    return this.requestEmployeeService.rejectRequest(payload);
  }

  @Get('/pending')
  findAllPendingRequestsByUser(@Req() req: Request, @Query() query: QuerySpecificationDto) {
    return this.requestEmployeeService.findAllPendingRequestsByUser({employeeId: req.user.id}, query);
  }

  @Get('/approved')
  findAllApprovedRequestsByUser(@Req() req: Request, @Query() query: QuerySpecificationDto) {
    return this.requestEmployeeService.findAllApprovedRequestsByUser({employeeId: req.user.id}, query);
  }

  @Get('/pending-count')
  countPendingRequests(@Req() req: Request) {
    return this.requestEmployeeService.countPendingRequests(req.user.id);
  }

  @Get('/approved-count')
  countApprovedRequests(@Req() req: Request) {
    return this.requestEmployeeService.countApprovedRequests(req.user.id);
  }

  @Get(':id/details')
  getRequestEmployeeDetailsById(@Param('id', ParseIntPipe) id: number) {
    return this.requestEmployeeService.getRequestEmployeeDetailsById(id);
  }
}
