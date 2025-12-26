import { jest } from '@jest/globals';
import { type TaskWithRelations } from '../../../../src/modules/task/task.repository';
import { HttpNotFoundError, HttpBadRequestError } from '../../../../src/lib/errors';

// Mocks
const mockTaskRepository: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getDashboardStats: jest.fn(),
};

const mockAuthRepository: any = {
    findUserById: jest.fn(),
};

const mockSocketService: any = {
    emitTaskCreated: jest.fn(),
    emitTaskUpdated: jest.fn(),
    emitTaskDeleted: jest.fn(),
    notifyTaskAssigned: jest.fn(),
};

const mockNotificationServiceInstance: any = {
    createTaskAssignmentNotification: jest.fn(),
};

const MockNotificationService = jest.fn(() => mockNotificationServiceInstance);

const mockLogger: any = {
    info: jest.fn(),
    error: jest.fn(),
};

// Apply mocks
jest.mock('../../../../src/modules/task/task.repository', () => ({
    __esModule: true,
    default: mockTaskRepository,
}));

jest.mock('../../../../src/modules/auth/auth.repository', () => ({
    __esModule: true,
    default: mockAuthRepository,
}));

jest.mock('../../../../src/lib/socket', () => ({
    __esModule: true,
    default: mockSocketService,
}));

jest.mock('../../../../src/modules/notification/notification.service', () => ({
    __esModule: true,
    default: MockNotificationService,
}));

jest.mock('../../../../src/lib/logger', () => ({
    __esModule: true,
    default: mockLogger,
}));

// Import subject under test
import TaskService from '../../../../src/modules/task/task.service';
import { CreateTaskDto, UpdateTaskDto } from '../../../../src/dto/task.dto';

describe('[Unit] - TaskService', () => {
    let taskService: TaskService;

    beforeEach(() => {
        jest.clearAllMocks();
        taskService = new TaskService();
    });

    describe('create', () => {
        const createTaskDto: CreateTaskDto = {
            title: 'Test Task',
            description: 'Test Description',
            dueDate: new Date().toISOString(),
            priority: 'HIGH',
            status: 'TODO',
            assignedToId: 'assignee-id',
        };

        const options = { userId: 'creator-id' };

        it('should create a task successfully when assignee exists', async () => {
            const mockAssignee = { id: 'assignee-id', name: 'Assignee', email: 'test@test.com' };
            const mockCreatedTask = {
                id: 'task-id',
                ...createTaskDto,
                dueDate: new Date(createTaskDto.dueDate),
                creatorId: options.userId,
                assignedToId: createTaskDto.assignedToId,
                createdAt: new Date(),
                updatedAt: new Date(),
                creator: { id: options.userId, name: 'Creator', email: 'creator@test.com' },
                assignee: mockAssignee,
            } as unknown as TaskWithRelations;

            mockAuthRepository.findUserById.mockResolvedValue(mockAssignee);
            mockTaskRepository.create.mockResolvedValue(mockCreatedTask);

            const result = await taskService.create(createTaskDto, options);

            expect(mockAuthRepository.findUserById).toHaveBeenCalledWith(createTaskDto.assignedToId);
            expect(mockTaskRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                title: createTaskDto.title,
                priority: createTaskDto.priority,
                creator: { connect: { id: options.userId } },
                assignee: { connect: { id: createTaskDto.assignedToId } },
            }));
            expect(mockSocketService.emitTaskCreated).toHaveBeenCalledWith({
                taskId: mockCreatedTask.id,
                task: mockCreatedTask,
            });
            expect(result).toEqual(mockCreatedTask);
        });

        it('should throw HttpBadRequestError if assignee does not exist', async () => {
            mockAuthRepository.findUserById.mockResolvedValue(null);

            await expect(taskService.create(createTaskDto, options))
                .rejects
                .toThrow(HttpBadRequestError);

            expect(mockTaskRepository.create).not.toHaveBeenCalled();
        });

        it('should notify assignee if different from creator', async () => {
            const mockAssignee = { id: 'assignee-id', name: 'Assignee', email: 'test@test.com' };
            const mockCreatedTask = {
                id: 'task-id',
                title: 'Test Task',
                assignedToId: 'assignee-id',
                // ... other props
            } as unknown as TaskWithRelations;

            mockAuthRepository.findUserById.mockResolvedValue(mockAssignee);
            mockTaskRepository.create.mockResolvedValue(mockCreatedTask);

            await taskService.create(createTaskDto, options);

            expect(mockNotificationServiceInstance.createTaskAssignmentNotification).toHaveBeenCalledWith(
                mockCreatedTask.id,
                createTaskDto.assignedToId,
                mockCreatedTask.title,
                mockCreatedTask
            );
        });
    });

    describe('update', () => {
        const updateTaskDto: UpdateTaskDto = {
            status: 'IN_PROGRESS',
        };
        const taskId = 'task-id';
        const userId = 'user-id';

        it('should update task successfully', async () => {
            const mockExistingTask = {
                id: taskId,
                assignedToId: 'assignee-id',
            } as TaskWithRelations;

            const mockUpdatedTask = {
                ...mockExistingTask,
                status: 'IN_PROGRESS',
            } as TaskWithRelations;

            mockTaskRepository.findById.mockResolvedValue(mockExistingTask);
            mockTaskRepository.update.mockResolvedValue(mockUpdatedTask);

            const result = await taskService.update(taskId, updateTaskDto, userId);

            expect(mockTaskRepository.findById).toHaveBeenCalledWith(taskId);
            expect(mockTaskRepository.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
                status: 'IN_PROGRESS'
            }));
            expect(mockSocketService.emitTaskUpdated).toHaveBeenCalledWith({
                taskId,
                task: mockUpdatedTask
            });
            expect(result).toEqual(mockUpdatedTask);
        });

        it('should throw HttpNotFoundError if task does not exist', async () => {
            mockTaskRepository.findById.mockResolvedValue(null);

            await expect(taskService.update(taskId, updateTaskDto, userId))
                .rejects
                .toThrow(HttpNotFoundError);

            expect(mockTaskRepository.update).not.toHaveBeenCalled();
        });

        it('should notify new assignee if assignment changes', async () => {
            const updateAssignmentDto: UpdateTaskDto = {
                assignedToId: 'new-assignee-id',
            };
            const mockExistingTask = {
                id: taskId,
                assignedToId: 'old-assignee-id',
                title: 'Task Title'
            } as TaskWithRelations;

            const mockUpdatedTask = {
                ...mockExistingTask,
                assignedToId: 'new-assignee-id',
            } as TaskWithRelations;

            const mockNewAssignee = { id: 'new-assignee-id' };

            mockTaskRepository.findById.mockResolvedValue(mockExistingTask);
            mockAuthRepository.findUserById.mockResolvedValue(mockNewAssignee);
            mockTaskRepository.update.mockResolvedValue(mockUpdatedTask);

            await taskService.update(taskId, updateAssignmentDto, userId);

            expect(mockNotificationServiceInstance.createTaskAssignmentNotification).toHaveBeenCalledWith(
                taskId,
                'new-assignee-id',
                mockExistingTask.title,
                mockUpdatedTask
            );
        });
    });
});
