import { Router } from 'express';
import Controller from './task.controller';
import { CreateTaskDto, UpdateTaskDto } from '@/dto/task.dto';
import RequestValidator from '@/middlewares/request-validator';
import { verifyAuthToken } from '@/middlewares/auth';

const task: Router = Router();
const controller = new Controller();

// All task routes require authentication
task.use(verifyAuthToken);

/**
 * Task object
 * @typedef {object} Task
 * @property {string} id - Task ID
 * @property {string} title - Task title
 * @property {string} description - Task description
 * @property {string} dueDate - Due date
 * @property {string} priority - Priority (LOW, MEDIUM, HIGH, URGENT)
 * @property {string} status - Status (TODO, IN_PROGRESS, REVIEW, COMPLETED)
 * @property {object} creator - Creator user
 * @property {object} assignee - Assigned user
 */

/**
 * Create task body
 * @typedef {object} CreateTaskBody
 * @property {string} title.required - Task title (max 100 chars)
 * @property {string} description.required - Task description
 * @property {string} dueDate.required - Due date (ISO format)
 * @property {string} priority.required - Priority (LOW, MEDIUM, HIGH, URGENT)
 * @property {string} status - Status (default: TODO)
 * @property {string} assignedToId.required - Assignee user ID
 */

/**
 * Update task body
 * @typedef {object} UpdateTaskBody
 * @property {string} title - Task title
 * @property {string} description - Task description
 * @property {string} dueDate - Due date
 * @property {string} priority - Priority
 * @property {string} status - Status
 * @property {string} assignedToId - Assignee user ID
 */

/**
 * POST /tasks
 * @summary Create a new task
 * @tags tasks
 * @security bearerAuth
 * @param {CreateTaskBody} request.body.required
 * @return {Task} 201 - Task created
 */
task.post('/', RequestValidator.validate(CreateTaskDto), controller.create);

/**
 * GET /tasks
 * @summary Get all tasks with optional filtering
 * @tags tasks
 * @security bearerAuth
 * @param {string} status.query - Filter by status
 * @param {string} priority.query - Filter by priority
 * @param {string} sortByDueDate.query - Sort order (asc/desc)
 * @param {string} assignedToMe.query - Filter tasks assigned to current user
 * @param {string} createdByMe.query - Filter tasks created by current user
 * @param {string} overdue.query - Filter overdue tasks
 * @return {array<Task>} 200 - Array of tasks
 */
task.get('/', controller.findAll);

/**
 * GET /tasks/:id
 * @summary Get a task by ID
 * @tags tasks
 * @security bearerAuth
 * @param {string} id.path.required - Task ID
 * @return {Task} 200 - Task details
 */
task.get('/:id', controller.findById);

/**
 * PUT /tasks/:id
 * @summary Update a task
 * @tags tasks
 * @security bearerAuth
 * @param {string} id.path.required - Task ID
 * @param {UpdateTaskBody} request.body.required
 * @return {Task} 200 - Updated task
 */
task.put('/:id', RequestValidator.validate(UpdateTaskDto), controller.update);

/**
 * DELETE /tasks/:id
 * @summary Delete a task
 * @tags tasks
 * @security bearerAuth
 * @param {string} id.path.required - Task ID
 * @return {object} 200 - Task deleted
 */
task.delete('/:id', controller.delete);

export default task;
