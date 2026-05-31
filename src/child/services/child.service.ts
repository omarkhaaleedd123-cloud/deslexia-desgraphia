import { Injectable, NotFoundException } from '@nestjs/common';
import { ChildProvider } from '../providers/child.provider';
import { CreateChildDto } from '../dto/create-child.dto';
import { UpdateChildDto } from '../dto';

@Injectable()
export class ChildrenService {
  constructor(private readonly childProvider: ChildProvider) { }

  async create(userId: number, dto: CreateChildDto) {
    const child = await this.childProvider.create(userId, dto);
    return {
      message: 'Child created successfully',
      data: child,
    };
  }

  async findAllByParent(parentId: number) {
    return this.childProvider.findAllByParent(parentId);
  }

  async findOne(id: number, parentId: number) {
    const child = await this.childProvider.findOne(id, parentId);
    if (!child) {
      throw new NotFoundException('Child not found or you are not authorized to view it');
    }
    return child;
  }

  async update(id: number, parentId: number, dto: UpdateChildDto) {
    const updated = await this.childProvider.update(id, parentId, dto);
    if (!updated) {
      throw new NotFoundException('Child not found or you are not allowed to update it');
    }
    return {
      message: 'Child updated successfully',
      data: updated,
    };
  }

  async delete(id: number, parentId: number) {
    const deletedCount = await this.childProvider.remove(id, parentId);
    if (deletedCount === 0) {
      throw new NotFoundException('Child not found or you are not allowed to delete it');
    }
    return {
      message: 'Child deleted successfully',
    };
  }
}
