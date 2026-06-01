import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'exercises' })
export class Exercise extends Model<Exercise> {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({
    type: DataType.ENUM('speech', 'handwriting', 'reading'),
    allowNull: false
  })
  type: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  content: string;

  @Column({ type: DataType.STRING, allowNull: true })
  imageUrl: string;

  @Column({ type: DataType.STRING, allowNull: true })
  audioUrl: string;

  @Column({
    type: DataType.ENUM('1', '2', '3', '4', '5', '6', '7'),
    allowNull: false,
    defaultValue: '1'
  })
  level: string;
}