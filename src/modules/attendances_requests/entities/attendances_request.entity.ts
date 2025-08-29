import {Entity, PrimaryColumn} from 'typeorm';

@Entity('attendances_requests')
export class AttendancesRequestEntity {
  @PrimaryColumn({type: 'int'})
  attendanceId: number;

  @PrimaryColumn({type: 'int'})
  requestEmpId: number;
}
