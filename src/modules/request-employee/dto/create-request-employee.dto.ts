import {Type} from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import {HINH_THUC_NGHI_PHEP, REQUEST_TYPE} from 'src/shared/constants';
import {IsDateAfterOrEqual} from 'src/shared/validators/date.validator';

export class CreateRequestEmployeeDto {
  @ValidateIf(
    (o) =>
      o.requestType !== REQUEST_TYPE.DI_CONG_TAC &&
      !(o.requestType === REQUEST_TYPE.NGHI_PHEP && o.hinh_thuc === HINH_THUC_NGHI_PHEP.NHIEU_NGAY),
  )
  @IsNotEmpty({message: 'Date không được để trống'})
  date: string;

  @IsNotEmpty({message: 'employeeId không được để trống'})
  @IsNumber({}, {message: 'employeeId phải là số'})
  @Type(() => Number)
  employeeId: number;

  @IsNotEmpty({message: 'reason không được để trống'})
  @IsString({message: 'reason phải là chuỗi'})
  @MaxLength(500, {message: 'reason không được vượt quá 500 ký tự'})
  reason: string;

  @IsNotEmpty({message: 'requestType không được để trống'})
  @IsNumber({}, {message: 'requestType phải là số'})
  @Type(() => Number)
  requestType: number;

  @IsNotEmpty({message: 'attendance_id không được để trống'})
  @IsNumber({}, {message: 'attendance_id phải là số'})
  @Type(() => Number)
  attendance_id: number;

  @IsNotEmpty({message: 'created_request không được để trống'})
  @IsString({message: 'created_request phải là chuỗi'})
  created_request: string;

  @IsNotEmpty({message: 'approvers không được để trống'})
  approvers: {value: string; label: string}[];

  @IsOptional()
  referrers: {value: string; label: string}[];

  @ValidateIf(
    (o) =>
      o.requestType === REQUEST_TYPE.DI_MUON_VE_SOM ||
      (o.requestType !== REQUEST_TYPE.DI_CONG_TAC && o.requestType !== REQUEST_TYPE.NGHI_VIEC),
  )
  @IsOptional()
  @IsString({message: 'start_time phải là chuỗi'})
  start_time?: string | null;

  @ValidateIf(
    (o) =>
      o.requestType !== REQUEST_TYPE.DI_MUON_VE_SOM &&
      o.requestType !== REQUEST_TYPE.DI_CONG_TAC &&
      o.requestType !== REQUEST_TYPE.NGHI_VIEC,
  )
  @IsOptional()
  @IsString({message: 'end_time phải là chuỗi'})
  end_time?: string | null;

  @ValidateIf((o) => o.requestType === REQUEST_TYPE.NGHI_PHEP)
  @IsOptional()
  @IsString({message: 'hinh_thuc phải là chuỗi'})
  hinh_thuc?: string | null;

  @ValidateIf((o) => o.requestType === REQUEST_TYPE.DI_MUON_VE_SOM || o.requestType === REQUEST_TYPE.NGHI_PHEP)
  @IsOptional()
  @IsString({message: 'loai_nghi phải là chuỗi'})
  loai_nghi?: string | null;

  @ValidateIf(
    (o) =>
      o.requestType === REQUEST_TYPE.DI_CONG_TAC ||
      (o.requestType === REQUEST_TYPE.NGHI_PHEP && o.hinh_thuc === HINH_THUC_NGHI_PHEP.NHIEU_NGAY),
  )
  @IsNotEmpty({message: 'Ngày bắt đầu không được để trống'})
  @IsDateString({}, {message: 'Ngày bắt đầu phải có định dạng hợp lệ (YYYY-MM-DD)'})
  from_date?: string;

  @ValidateIf(
    (o) =>
      o.requestType === REQUEST_TYPE.DI_CONG_TAC ||
      (o.requestType === REQUEST_TYPE.NGHI_PHEP && o.hinh_thuc === HINH_THUC_NGHI_PHEP.NHIEU_NGAY),
  )
  @IsNotEmpty({message: 'Ngày kết thúc không được để trống'})
  @IsDateString({}, {message: 'Ngày kết thúc phải có định dạng hợp lệ (YYYY-MM-DD)'})
  @Validate(IsDateAfterOrEqual, ['from_date'], {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
  })
  to_date?: string;
}
