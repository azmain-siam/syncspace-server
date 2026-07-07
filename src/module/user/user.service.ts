import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // findAll(): ApiResponse<User[]> {
  //   return { data: [], message: 'Users fetched successfully' };
  // }

  // async create(email: string, password: string) {
  //   const hashedPassword = await bcrypt.hash(password, 10);
  //   const user = await this.prisma.user.create({
  //     data: {
  //       email,
  //       password: hashedPassword,
  //     },
  //   });

  //   return user;
  // }
}
