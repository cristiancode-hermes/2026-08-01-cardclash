import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { PacksService } from './packs.service';

@UseGuards(JwtAuthGuard)
@Controller('packs')
export class PacksController {
  constructor(private readonly packsService: PacksService) {}

  @Get()
  findAll() {
    return this.packsService.findPacks();
  }

  @Post(':id/open')
  open(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.packsService.openPack(user.id, id);
  }
}
