import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: string) {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }
}
