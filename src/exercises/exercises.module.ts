import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExercisesController } from './controllers/exercises.controller';
import { ExercisesService } from './services/exercises.service';
import { Exercise } from './entities/exercises.entity';
import { ExerciseProvider } from './providers/exercises.provider';
import { ExercisesSeeder } from './exercises.seeder';

@Module({
  imports: [
    SequelizeModule.forFeature([Exercise]), 
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService, ExerciseProvider,ExercisesSeeder],
  exports: [ExercisesService], 
})
export class ExercisesModule {}