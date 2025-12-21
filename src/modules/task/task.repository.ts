import { type Task, type Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export interface TaskFilters {
    status?: string;
    priority?: string;
    creatorId?: string;
    assignedToId?: string;
    overdue?: boolean;
}

export interface TaskWithRelations extends Task {
    creator?: { id: string; name: string; email: string };
    assignee?: { id: string; name: string; email: string };
}

export interface DashboardStats {
    counts: {
        total: number;
        todo: number;
        inProgress: number;
        completed: number;
    };
    recentTasks: TaskWithRelations[];
}

export class TaskRepository {
    private readonly userSelect = {
        id: true,
        name: true,
        email: true,
    };

    /**
     * Creates a new task in the database
     * @param data - Task creation data
     * @returns The created task with relations
     */
    public async create(data: Prisma.TaskCreateInput): Promise<TaskWithRelations> {
        return prisma.task.create({
            data,
            include: {
                creator: { select: this.userSelect },
                assignee: { select: this.userSelect },
            },
        });
    }

    /**
     * Finds all tasks with optional filtering and sorting
     * @param filters - Optional filters for status, priority, etc.
     * @param sortByDueDate - Sort order for due date
     * @returns Array of tasks with relations
     */
    public async findAll(
        filters: TaskFilters = {},
        sortByDueDate: 'asc' | 'desc' = 'asc'
    ): Promise<TaskWithRelations[]> {
        const where: Prisma.TaskWhereInput = {};

        if (filters.status) {
            where.status = filters.status as Prisma.EnumStatusFilter['equals'];
        }

        if (filters.priority) {
            where.priority = filters.priority as Prisma.EnumPriorityFilter['equals'];
        }

        if (filters.creatorId) {
            where.creatorId = filters.creatorId;
        }

        if (filters.assignedToId) {
            where.assignedToId = filters.assignedToId;
        }

        if (filters.overdue) {
            where.dueDate = { lt: new Date() };
            where.status = { not: 'COMPLETED' };
        }

        return prisma.task.findMany({
            where,
            orderBy: { dueDate: sortByDueDate },
            include: {
                creator: { select: this.userSelect },
                assignee: { select: this.userSelect },
            },
        });
    }

    /**
     * Finds a single task by ID
     * @param id - Task ID
     * @returns Task with relations or null
     */
    public async findById(id: string): Promise<TaskWithRelations | null> {
        return prisma.task.findUnique({
            where: { id },
            include: {
                creator: { select: this.userSelect },
                assignee: { select: this.userSelect },
            },
        });
    }

    /**
     * Updates a task by ID
     * @param id - Task ID
     * @param data - Update data
     * @returns Updated task with relations
     */
    public async update(
        id: string,
        data: Prisma.TaskUpdateInput
    ): Promise<TaskWithRelations> {
        return prisma.task.update({
            where: { id },
            data,
            include: {
                creator: { select: this.userSelect },
                assignee: { select: this.userSelect },
            },
        });
    }

    /**
     * Deletes a task by ID
     * @param id - Task ID
     */
    public async delete(id: string): Promise<void> {
        await prisma.task.delete({
            where: { id },
        });
    }

    /**
     * Checks if a task exists
     * @param id - Task ID
     * @returns Boolean indicating existence
     */
    public async exists(id: string): Promise<boolean> {
        const task = await prisma.task.findUnique({
            where: { id },
            select: { id: true },
        });
        return !!task;
    }

    /**
     * Gets dashboard statistics for a user
     * @param userId - User ID
     * @returns Dashboard stats including counts and recent tasks
     */
    public async getDashboardStats(userId: string): Promise<DashboardStats> {
        const [total, todo, inProgress, completed, recentTasks] = await prisma.$transaction([
            prisma.task.count({ where: { assignedToId: userId } }),
            prisma.task.count({ where: { assignedToId: userId, status: 'TODO' } }),
            prisma.task.count({ where: { assignedToId: userId, status: 'IN_PROGRESS' } }),
            prisma.task.count({ where: { assignedToId: userId, status: 'COMPLETED' } }),
            prisma.task.findMany({
                where: { assignedToId: userId },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                include: {
                    creator: { select: this.userSelect },
                    assignee: { select: this.userSelect },
                },
            }),
        ]);

        return {
            counts: {
                total,
                todo,
                inProgress,
                completed,
            },
            recentTasks,
        };
    }
}

export default new TaskRepository();
