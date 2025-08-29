import {ValueTransformer} from 'typeorm';

class ColumnBooleanTransformer implements ValueTransformer {
  public from(value?: string | null): boolean | undefined {
    return !!value;
  }

  public to(value?: boolean | null): number | undefined {
    return value ? 1 : 0;
  }
}

class DecimalTransformer implements ValueTransformer {
  public to(data: number): number {
    return data;
  }
  public from(data: string): number {
    return parseFloat(data);
  }
}

export {ColumnBooleanTransformer, DecimalTransformer};
