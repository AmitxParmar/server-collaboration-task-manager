import { Priority, Status } from '@prisma/client';
import {
    IsString,
    IsNotEmpty,
    IsDateString,
    IsEnum,
    IsOptional,
    MaxLength,
    IsIn,
} from 'class-validator';



export class CreateTaskDto {
    @IsString()
    @IsNotEmpty({ message: 'Title is required' })
    @MaxLength(100, { message: 'Title must not exceed 100 characters' })
    title: string;

    @IsString()
    @IsNotEmpty({ message: 'Description is required' })
    description: string;

    @IsDateString({}, { message: 'Invalid date format' })
    @IsNotEmpty({ message: 'Due date is required' })
    dueDate: string;

    @IsEnum(Priority, { message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT' })
    @IsNotEmpty({ message: 'Priority is required' })
    priority: Priority;

    @IsEnum(Status, { message: 'Status must be TODO, IN_PROGRESS, REVIEW, or COMPLETED' })
    @IsOptional()
    status?: Status;

    @IsString()
    @IsNotEmpty({ message: 'Assignee ID is required' })
    assignedToId: string;
}

export class UpdateTaskDto {
    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'Title must not exceed 100 characters' })
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString({}, { message: 'Invalid date format' })
    @IsOptional()
    dueDate?: string;

    @IsEnum(Priority, { message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT' })
    @IsOptional()
    priority?: Priority;

    @IsEnum(Status, { message: 'Status must be TODO, IN_PROGRESS, REVIEW, or COMPLETED' })
    @IsOptional()
    status?: Status;

    @IsString()
    @IsOptional()
    assignedToId?: string;
}

export class TaskQueryDto {
    @IsOptional()
    @IsEnum(Status, { message: 'Invalid status filter' })
    status?: Status;

    @IsOptional()
    @IsEnum(Priority, { message: 'Invalid priority filter' })
    priority?: Priority;

    @IsOptional()
    @IsIn(['asc', 'desc'], { message: 'Sort order must be asc or desc' })
    sortByDueDate?: 'asc' | 'desc';

    @IsOptional()
    @IsIn(['true', 'false'])
    overdue?: string;

    @IsOptional()
    @IsIn(['true', 'false'])
    assignedToMe?: string;

    @IsOptional()
    @IsIn(['true', 'false'])
    createdByMe?: string;
}
