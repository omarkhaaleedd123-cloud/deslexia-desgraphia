import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Submission } from './entities/submission.entity';
import { Child } from '../child/entities/child.entity';
import { SubmissionService } from './services/submission.service';
import { SubmissionProvider } from './providers/submission.provider';
import { SubmissionController } from './controllers/submission.controller';
import { Exercise } from 'src/exercises/entities/exercises.entity';

@Module({
  imports: [SequelizeModule.forFeature([Submission, Exercise, Child])],
  controllers: [SubmissionController],
  providers: [SubmissionService, SubmissionProvider],
  exports: [SubmissionService],
})
export class SubmissionModule { }
