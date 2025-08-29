import {Injectable} from '@nestjs/common';
import type {ConfigKeys} from './type';

@Injectable()
export class ConfigurationService {
  /**
   * Get the value of a key from the environment variables.
   */
  get(key: ConfigKeys): string {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" is not defined`);
    }
    return value;
  }

  /**
   * Get the value of a key from the environment variables as a number.
   */
  getNumber(key: ConfigKeys): number {
    return Number(this.get(key));
  }
}
