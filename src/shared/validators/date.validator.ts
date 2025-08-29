import {ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface} from 'class-validator';

@ValidatorConstraint({name: 'isDateAfterOrEqual', async: false})
export class IsDateAfterOrEqual implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    // Nếu không có giá trị so sánh, bỏ qua validation
    if (!relatedValue || !value) return true;

    const dateToCompare = new Date(relatedValue);
    const dateToValidate = new Date(value);

    // Kiểm tra xem dateToValidate có sau hoặc bằng dateToCompare không
    return dateToValidate >= dateToCompare;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} phải sau hoặc bằng ${relatedPropertyName}`;
  }
}
