import {ApiProperty} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsArray, IsBoolean, IsDefined, IsOptional, IsPositive, IsString, Max} from 'class-validator';

export class QuerySpecificationDto {
  // PaginationSpecificationDto
  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Transform(({value}) => value && parseInt(String(value)))
  @IsPositive()
  @Max(10)
  limit?: number;

  @ApiProperty({
    description: 'Số trang hiện tại',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({value}) => value && parseInt(String(value)))
  @IsPositive()
  page?: number;

  @ApiProperty({
    description: 'Tắt phân trang',
    example: false,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({value}) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true') return true;
      if (lowerValue === 'false') return false;
      if (lowerValue === '0') return false;
      if (lowerValue === '1') return true;
    }
    return false;
  })
  @IsBoolean()
  disablePagination?: boolean;

  // SortSpecificationDto
  @ApiProperty({
    description: 'Trường sắp xếp',
    example: ['name', 'createdAt'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  sort?: string[];

  // SearchSpecificationDto
  @ApiProperty({
    description: 'Từ khóa tìm kiếm',
    example: 'admin',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsDefined()
  search?: Record<string, any>;

  @ApiProperty({
    description: 'Các trường tìm kiếm',
    required: false,
    example: ['name', 'email'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  @Transform(({value}) => {
    // Nếu không có giá trị, trả về mảng rỗng
    if (!value) return [];
    // Nếu đã là mảng rồi thì giữ nguyên
    if (Array.isArray(value)) return value;
    // Nếu là chuỗi JSON thì parse
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error('Error parsing searchFields JSON string:', e);
      }
    }
    // Nếu là chuỗi thường thì split bằng dấu phẩy
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim());
    }
    // Trường hợp khác trả về mảng rỗng
    return [];
  })
  searchFields?: string[];

  @ApiProperty({
    description: 'Tham số lọc',
    example: {name: 'admin', age: 18},
    required: false,
    type: Object,
  })
  @IsOptional()
  @Transform(({value, obj, key}) => {
    // Nếu đã là object thì trả về
    if (value && typeof value === 'object') return value;
    // Nếu là string JSON thì parse
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        // Không phải JSON
      }
    }
    // Tìm kiếm các tham số query dạng filter[key]
    const result = {};
    for (const paramKey in obj) {
      // Nếu tham số bắt đầu bằng 'filter['
      if (paramKey.startsWith('filter[') && paramKey.endsWith(']')) {
        // Lấy tên trường giữa filter[ và ]
        const fieldName = paramKey.substring(7, paramKey.length - 1);
        result[fieldName] = obj[paramKey];
        // Chuyển đổi giá trị thành số nếu có thể
        if (!isNaN(Number(obj[paramKey]))) {
          result[fieldName] = Number(obj[paramKey]);
        }
      }
    }
    return Object.keys(result).length > 0 ? result : value;
  })
  filter?: Record<string, any>;
}
