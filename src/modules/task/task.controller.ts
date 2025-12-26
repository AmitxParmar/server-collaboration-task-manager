import { type NextFunction } from 'express';
import { HttpStatusCode } from 'axios';
import TaskService from './task.service';
import { type CustomResponse } from '@/types/common.type';
import { type AuthRequest } from '@/types/auth.type';
import { type TaskWithRelations, type DashboardStats } from './task.repository';
import Api from '@/lib/api';

export default class TaskController extends Api {
    private readonly taskService = new TaskService();

    /**
     * POST /tasks - Create a new task
     */
    public create = async (
        req: AuthRequest,
        res: CustomResponse<TaskWithRelations>,
        next: NextFunction
    ) => {
        try {
            const task = await this.taskService.create(req.body, {
                userId: req.user!.id,
            });
            this.send(res, task, HttpStatusCode.Created, 'Task created successfully');
        } catch (e) {
            next(e);
        }
    };

    /**
     * GET /tasks - Get all tasks with optional filtering
     */
    public findAll = async (
        req: AuthRequest,
        res: CustomResponse<TaskWithRelations[]>,
        next: NextFunction
    ) => {
        try {
            const tasks = await this.taskService.findAll(req.query, {
                userId: req.user!.id,
            });
            this.send(res, tasks, HttpStatusCode.Ok, 'Tasks retrieved successfully');
        } catch (e) {
            next(e);
        }
    };

    /**
     * GET /tasks/:id - Get a single task by ID
     */
    public findById = async (
        req: AuthRequest,
        res: CustomResponse<TaskWithRelations>,
        next: NextFunction
    ) => {
        try {
            const task = await this.taskService.findById(req.params.id);
            this.send(res, task, HttpStatusCode.Ok, 'Task retrieved successfully');
        } catch (e) {
            next(e);
        }
    };

    /**
     * PUT /tasks/:id - Update a task by ID
     */
    public update = async (
        req: AuthRequest,
        res: CustomResponse<TaskWithRelations>,
        next: NextFunction
    ) => {
        try {
            const task = await this.taskService.update(req.params.id, req.body);
            this.send(res, task, HttpStatusCode.Ok, 'Task updated successfully');
        } catch (e) {
            next(e);
        }
    };

    /**
     * DELETE /tasks/:id - Delete a task by ID
     */
    public delete = async (
        req: AuthRequest,
        res: CustomResponse<null>,
        next: NextFunction
    ) => {
        try {
            await this.taskService.delete(req.params.id);
            this.send(res, null, HttpStatusCode.Ok, 'Task deleted successfully');
        } catch (e) {
            next(e);
        }
    };

    /**
     * GET /tasks/dashboard - Get dashboard statistics
     */
    public getDashboardStats = async (
        req: AuthRequest,
        res: CustomResponse<DashboardStats>,
        next: NextFunction
    ) => {
        try {
            const stats = await this.taskService.getDashboardStats({
                userId: req.user!.id,
            });
            this.send(res, stats, HttpStatusCode.Ok, 'Dashboard stats retrieved successfully');
        } catch (e) {
            next(e);
        }
    };
}
