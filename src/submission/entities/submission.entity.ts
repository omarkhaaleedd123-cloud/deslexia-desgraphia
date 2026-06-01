import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Child } from '../../child/entities/child.entity';

export enum ExerciseType {
  READING = 'reading',
  WRITING = 'writing',
  LISTENING = 'listening',
}

export enum SubmissionStatus {
  PASS = 'pass',
  FAIL = 'fail',
}

@Table({
  tableName: 'submissions',
  timestamps: true,
})
export class Submission extends Model<Submission> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  //
  @ForeignKey(() => Child)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  childId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  level: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  exerciseId: number;

  // enum
  @Column({
    type: DataType.ENUM('reading', 'writing', 'listening'),
    allowNull: false,
  })
  exerciseType: ExerciseType;

  // enum
  @Column({
    type: DataType.ENUM('pass', 'fail'),
    allowNull: false,
  })
  status: SubmissionStatus;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  attemptsCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  duration: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalItems: number;

  // array
  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  mistakes: string[];

  // object
  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  metadata: any;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Child, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  child: Child;
}
