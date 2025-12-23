import { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import jwtService from '@/lib/jwt';
import authRepository from '@/modules/auth/auth.repository';
import logger from '@/lib/logger';
import {
    SocketEvents,
    type AuthenticatedSocket,
    type TaskEventPayload,
    type NotificationPayload,
} from '@/types/socket.type';

class SocketService {
    private io: Server | null = null;
    private static instance: SocketService;

    /**
     * Gets the singleton instance of SocketService
     */
    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    /**
     * Initializes Socket.io with the HTTP server
     * @param httpServer - The HTTP server instance
     */
    public initialize(httpServer: HttpServer): Server {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:3000',
                credentials: true,
            },
        });

        // Authentication middleware
        this.io.use(async (socket: AuthenticatedSocket, next) => {
            try {
                // Parse cookies from handshake headers
                const cookieHeader = socket.handshake.headers?.cookie || '';
                const cookies = this.parseCookies(cookieHeader);
                const token = cookies['access_token'] ||
                    socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.replace('Bearer ', '');

                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const payload = jwtService.verifyAccessToken(token);
                if (!payload) {
                    return next(new Error('Invalid or expired token'));
                }

                const user = await authRepository.findUserById(payload.userId);
                if (!user) {
                    return next(new Error('User not found'));
                }

                socket.user = user;
                next();
            } catch (error) {
                next(new Error('Authentication failed'));
            }
        });

        // Connection handler
        this.io.on(SocketEvents.CONNECTION, (socket: AuthenticatedSocket) => {
            this.handleConnection(socket);
        });

        logger.info('Socket.io initialized');
        return this.io;
    }

    /**
     * Handles new socket connections
     */
    private handleConnection(socket: AuthenticatedSocket): void {
        const userId = socket.user?.id;
        logger.info(`User connected: ${userId}`);

        // Join user's personal room for targeted notifications
        if (userId) {
            socket.join(`user:${userId}`);
        }

        // Handle room joining
        socket.on(SocketEvents.JOIN_ROOM, (room: string) => {
            socket.join(room);
            logger.info(`User ${userId} joined room: ${room}`);
        });

        // Handle room leaving
        socket.on(SocketEvents.LEAVE_ROOM, (room: string) => {
            socket.leave(room);
            logger.info(`User ${userId} left room: ${room}`);
        });

        // Handle disconnection
        socket.on(SocketEvents.DISCONNECT, () => {
            logger.info(`User disconnected: ${userId}`);
        });
    }

    /**
     * Parse cookie header string into key-value pairs
     */
    private parseCookies(cookieHeader: string): Record<string, string> {
        const cookies: Record<string, string> = {};
        if (!cookieHeader) return cookies;

        cookieHeader.split(';').forEach((cookie) => {
            const [name, ...rest] = cookie.split('=');
            if (name && rest.length > 0) {
                cookies[name.trim()] = rest.join('=').trim();
            }
        });
        return cookies;
    }

    /**
     * Gets the Socket.io server instance
     */
    public getIO(): Server | null {
        return this.io;
    }

    /**
     * Broadcasts a task created event to all connected clients
     */
    public emitTaskCreated(payload: TaskEventPayload): void {
        if (!this.io) return;
        this.io.emit(SocketEvents.TASK_CREATED, payload);
        logger.info(`Emitted task:created for task ${payload.taskId}`);
    }

    /**
     * Broadcasts a task updated event to all connected clients
     */
    public emitTaskUpdated(payload: TaskEventPayload): void {
        if (!this.io) return;
        this.io.emit(SocketEvents.TASK_UPDATED, payload);
        logger.info(`Emitted task:updated for task ${payload.taskId}`);
    }

    /**
     * Broadcasts a task deleted event to all connected clients
     */
    public emitTaskDeleted(taskId: string): void {
        if (!this.io) return;
        this.io.emit(SocketEvents.TASK_DELETED, { taskId });
        logger.info(`Emitted task:deleted for task ${taskId}`);
    }

    /**
     * Sends a notification to a specific user
     */
    public sendNotificationToUser(userId: string, notification: NotificationPayload): void {
        if (!this.io) return;
        this.io.to(`user:${userId}`).emit(SocketEvents.NOTIFICATION, notification);
        logger.info(`Sent notification to user ${userId}`);
    }

    /**
     * Notifies a user when a task is assigned to them
     */
    public notifyTaskAssigned(userId: string, payload: TaskEventPayload): void {
        if (!this.io) return;
        this.io.to(`user:${userId}`).emit(SocketEvents.TASK_ASSIGNED, payload);
        logger.info(`Notified user ${userId} of task assignment`);
    }
}

export default SocketService.getInstance();
