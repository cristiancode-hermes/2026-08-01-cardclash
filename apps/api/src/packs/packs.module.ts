import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pack, User, UserCard, Card, PackOpening } from '../entities/entities';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pack, User, UserCard, Card, PackOpening])],
  controllers: [PacksController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
