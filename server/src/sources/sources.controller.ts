import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { SourcesService } from './sources.service';

class SourceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  label!: string;
}

@Controller('sources')
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Get()
  list() {
    return this.sources.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  create(@Body() dto: SourceDto) {
    return this.sources.create(dto.label);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SourceDto) {
    return this.sources.update(id, dto.label);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sources.remove(id);
  }
}
