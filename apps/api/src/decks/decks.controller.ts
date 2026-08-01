import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, Length, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { DecksService } from './decks.service';

class CreateDeckDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsArray()
  @ArrayMinSize(15)
  @ArrayMaxSize(30)
  cardIds: string[];
}

class UpdateDeckDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(15)
  @ArrayMaxSize(30)
  cardIds?: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.decksService.findAll(user.id);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const deck = await this.decksService.findOne(user.id, id);
    const cards = await this.decksService.deckCards(deck);
    return { ...deck, cards };
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDeckDto) {
    return this.decksService.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDeckDto) {
    return this.decksService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.decksService.remove(user.id, id);
  }
}
