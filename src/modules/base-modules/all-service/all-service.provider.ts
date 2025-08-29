import {Injectable} from '@nestjs/common';
import {ModuleRef} from '@nestjs/core';

@Injectable()
class AllServiceProvider {
  constructor(private moduleRef: ModuleRef) {}

  /**
   * get instance of one service, pass ServiceClass as input
   */
  getGlobal<ServiceClass>(serviceClass: new (...args: any) => ServiceClass): ServiceClass {
    return this.moduleRef.get(serviceClass, {strict: false});
  }

  /**
   * get instance of one service, pass ServiceClass as input
   *
   * alias of getGlobal
   */
  get = this.getGlobal;
}

export {AllServiceProvider as AllService};
