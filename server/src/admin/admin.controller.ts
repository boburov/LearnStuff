import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';

type AdminRole = 'PENDING' | 'ADMIN' | 'SUPER_ADMIN';

class UpdateAdminRoleDto {
  @IsString()
  @IsIn(['PENDING', 'ADMIN', 'SUPER_ADMIN'])
  role!: AdminRole;
}

class ListAdminsQuery {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'ADMIN', 'SUPER_ADMIN'])
  role?: AdminRole;

  @IsOptional()
  @IsString()
  search?: string;
}

class ListUsersQuery {
  @IsOptional()
  @IsString()
  search?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Query() q: ListUsersQuery) {
    return this.admin.listUsers(q);
  }

  @Get('admins')
  listAdmins(@Query() q: ListAdminsQuery) {
    return this.admin.listAdmins(q);
  }

  @Get('stats')
  @Roles('SUPER_ADMIN')
  stats() {
    return this.admin.stats();
  }

  @Patch('admins/:id/role')
  @Roles('SUPER_ADMIN')
  setAdminRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminRoleDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.admin.setAdminRole(id, dto.role, req.user.role as AdminRole);
  }

  @Delete('admins/:id')
  @Roles('SUPER_ADMIN')
  removeAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.admin.removeAdmin(id, req.user.role as AdminRole);
  }

  @Delete('users/:id')
  @Roles('SUPER_ADMIN')
  removeUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.admin.removeUser(id, req.user.role as AdminRole);
  }
}
