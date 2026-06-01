import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { CreateChildDto } from '../dto/create-child.dto';
import { UpdateChildDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ChildrenService } from '../services/child.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Children')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('api/children')
@ApiTags('Children')
@Controller('api/children') // شيلنا الـ Guard والـ ApiBearerAuth من هنا عشان الكنترولر يفتح معاكِ
export class ChildrenController {
  constructor(private readonly service: ChildrenService) { }

  @UseGuards(JwtAuthGuard) // حطيها هنا
  @ApiBearerAuth()        // وحطيها هنا
  @Post()
  @ApiOperation({ summary: 'Create child' })
  create(@CurrentUser() user: any, @Body() dto: CreateChildDto) {
    return this.service.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all children for the logged-in parent' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAllByParent(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific child by ID' })
  findOne(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Update child information' })
  update(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChildDto) {
    return this.service.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a child' })
  delete(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id, user.userId);
  }
}