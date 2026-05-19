import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) { }

  // telegram login
  async create(createAuthDto: CreateAuthDto) {
    const { tgId } = createAuthDto;
  }



  async login(createAuthDto: CreateAuthDto) { }
}
