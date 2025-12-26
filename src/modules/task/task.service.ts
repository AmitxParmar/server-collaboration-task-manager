import taskRepository, { type TaskFilters, type TaskWithRelations } from './task.repository';
import { type CreateTaskDto, type UpdateTaskDto, type TaskQueryDto } from '@/dto/task.dto';
import { HttpNotFoundError, HttpBadRequestError } from '@/lib/errors';
import authRepository from '@/modules/auth/auth.repository';
import logger from '@/lib/logger';
import socketService from '@/lib/socket';
import NotificationService from '@/modules/notification/notification.service';
import { Task } from '@prisma/client';

export interface TaskServiceOptions {
    userId: string;
}

export interface TaskDashboardResponse {
    counts: {
        total: number
        todo: number
        inProgress: number
        completed: number
    }
    recentTasks: Task[]
}

export default class TaskService {
    private readonly notificationService = new NotificationService();

    /**
     * Creates a new task
     * @param data - Task creation data from DTO
     * @param options - Service options including current user ID
     * @returns Created task with relations
     */
    public async create(
        data: CreateTaskDto,
        options: TaskServiceOptions
    ): Promise<TaskWithRelations> {
        logger.info('Task creation');
        // Verify assignee exists
        const assignee = await authRepository.findUserById(data.assignedToId);
        if (!assignee) {
            throw new HttpBadRequestError('Invalid assignee', ['Assigned user does not exist']);
        }

        const task = await taskRepository.create({
            title: data.title,
            description: data.description,
            dueDate: new Date(data.dueDate),
            priority: data.priority,
            status: data.status || 'TODO',
            creator: { connect: { id: options.userId } },
            assignee: { connect: { id: data.assignedToId } },
        });

        // Emit socket event for real-time update
        socketService.emitTaskCreated({ taskId: task.id, task });

        // Notify assignee if different from creator
        if (data.assignedToId !== options.userId) {
            await this.notificationService.createTaskAssignmentNotification(
                task.id,
                data.assignedToId,
                task.title,
                task
            );
        }

        return task;
    }

    /**
     * Gets all tasks with optional filtering and sorting
     * @param query - Query parameters for filtering/sorting
     * @param options - Service options including current user ID
     * @returns Array of tasks with relations
     */
    public async findAll(
        query: TaskQueryDto,
        options: TaskServiceOptions
    ): Promise<TaskWithRelations[]> {
        const filters: TaskFilters = {};

        if (query.status) {
            filters.status = query.status;
        }

        if (query.priority) {
            filters.priority = query.priority;
        }

        if (query.assignedToMe === 'true') {
            filters.assignedToId = options.userId;
        }

        if (query.createdByMe === 'true') {
            filters.creatorId = options.userId;
        }

        if (query.overdue === 'true') {
            filters.overdue = true;
        }

        const sortOrder = query.sortByDueDate || 'asc';

        return taskRepository.findAll(filters, sortOrder);
    }

    /**
     * Gets a single task by ID
     * @param id - Task ID
     * @returns Task with relations
     */
    public async findById(id: string): Promise<TaskWithRelations> {
        const task = await taskRepository.findById(id);
        if (!task) {
            throw new HttpNotFoundError('Task not found');
        }
        return task;
    }

    /**
     * Updates a task by ID
     * @param id - Task ID
     * @param data - Update data from DTO
     * @param currentUserId - Current user ID for assignment notifications
     * @returns Updated task with relations
     */
    public async update(
        id: string,
        data: UpdateTaskDto,
        currentUserId?: string
    ): Promise<TaskWithRelations> {
        logger.info(`Task update: ${id}`);

        // Get existing task for comparison
        const existingTask = await taskRepository.findById(id);
        if (!existingTask) {
            throw new HttpNotFoundError('Task not found');
        }

        // Verify assignee if being updated
        if (data.assignedToId) {
            const assignee = await authRepository.findUserById(data.assignedToId);
            if (!assignee) {
                throw new HttpBadRequestError('Invalid assignee', ['Assigned user does not exist']);
            }
        }

        const updateData: Record<string, unknown> = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.assignedToId !== undefined) {
            updateData.assignee = { connect: { id: data.assignedToId } };
        }

        const updatedTask = await taskRepository.update(id, updateData);

        // Emit socket event for real-time update
        socketService.emitTaskUpdated({ taskId: id, task: updatedTask });

        // Notify new assignee if assignment changed
        if (data.assignedToId && data.assignedToId !== existingTask.assignedToId) {
            await this.notificationService.createTaskAssignmentNotification(
                updatedTask.id,
                data.assignedToId,
                updatedTask.title,
                updatedTask
            );
        }

        return updatedTask;
    }

    /**
     * Deletes a task by ID
     * @param id - Task ID
     */
    public async delete(id: string): Promise<void> {
        logger.info(`Task deletion: ${id}`);
        const exists = await taskRepository.exists(id);
        if (!exists) {
            throw new HttpNotFoundError('Task not found');
        }

        await taskRepository.delete(id);

        // Emit socket event for real-time update
        socketService.emitTaskDeleted(id);
    }

    /**
     * Gets dashboard statistics for a user
     * @param options - Service options including current user ID
     * @returns Dashboard stats
     */
    public async getDashboardStats(options: TaskServiceOptions): Promise<TaskDashboardResponse> {
        return taskRepository.getDashboardStats(options.userId);
    }
}
