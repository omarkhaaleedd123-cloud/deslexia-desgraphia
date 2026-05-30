import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';
import { Child } from 'src/child/entities/child.entity';

@Table({
  tableName: 'conversations',
  timestamps: true,
})
export class Conversation extends Model<Conversation> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  title: string;

  @Column({
    type: DataType.ENUM('active', 'closed', 'archived'),
    defaultValue: 'active',
  })
  status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastMessageAt: Date;

  @ForeignKey(() => Child)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, 
  })
  childId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Child, {
    onDelete: 'SET NULL', 
    onUpdate: 'CASCADE',
  })
  child: Child;

  @HasMany(() => Message)
  messages: Message[];

  @HasOne(() => Message)
  lastMessage: Message;
}