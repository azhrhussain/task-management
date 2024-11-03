import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from './task-status.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { Repository } from 'typeorm';
import { User } from 'src/auth/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  async getAllTasks(): Promise<Task[]> {
    return await this.tasksRepository.find();
  }

  async getTaskWithFilters(
    filterDto: GetTasksFilterDto,
    user: User,
  ): Promise<Task[]> {
    const { status, search } = filterDto;

    const query = this.tasksRepository.createQueryBuilder('task');
    query.where({ user });
    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const tasks = await query.getMany();
    return tasks;
  }

  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { title, description } = createTaskDto;

    const task = this.tasksRepository.create({
      title,
      description,
      status: TaskStatus.OPEN,
      user,
    });

    const saveTask = await this.tasksRepository.save(task);
    return saveTask;
  }

  async getTaskById(id: string, user: User): Promise<Task> {
    try {
      const found = await this.tasksRepository.findOne({ where: { id, user } });

      if (!found) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      return found;
    } catch (error) {
      console.error('Error fetching task by ID:', error);
      throw new InternalServerErrorException('Could not retrieve task.');
    }
  }

  async deleteTaskById(id: string, user: User): Promise<Task> {
    const found = await this.getTaskById(id, user);
    const deletedItem = await this.tasksRepository.remove(found);
    return deletedItem;
  }

  async updateTaskStatusById(
    id: string,
    status: TaskStatus,
    user: User,
  ): Promise<Task> {
    const task = await this.getTaskById(id, user);
    task.status = status;
    const updateTask = await this.tasksRepository.save(task);
    return updateTask;
  }
}
