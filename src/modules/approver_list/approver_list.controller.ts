import {Body, Controller, Get, Post, Query, Req} from '@nestjs/common';
import {Request} from 'express';
import {ApproveRequestDto} from 'src/modules/approver_list/dto/create-approver_list.dto';
import {GetPendingApprovalsDto} from 'src/modules/approver_list/dto/get-pending-approvals.dto';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {ApproverListService} from './approver_list.service';

@Controller('approver-list')
export class ApproverListController {
  constructor(private readonly approverListService: ApproverListService) {}

  @Get('pending')
  getPendingApprovals(@Query() query: GetPendingApprovalsDto) {
    return this.approverListService.getPendingApprovals(query.employeeId);
  }

  @Get('approved')
  getApprovedRequests(@Query() query: QuerySpecificationDto, @Req() req: Request) {
    return this.approverListService.getApprovedRequests({userId: req.user?.id, query});
  }

  @Get('pending-count')
  countPendingApprovals(@Req() req: Request) {
    const employeeId = req.user?.id;
    return this.approverListService.countPendingApprovals(employeeId);
  }

  @Post('approve')
  approveRequest(@Body() body: ApproveRequestDto) {
    return this.approverListService.approveRequest(body);
  }
}
