import { type User } from '@prisma/client';
import prisma from '@/lib/prisma';
import LogMessage from '@/decorators/log-message.decorator';

export default class UserService {
  @LogMessage<[User]>({ message: 'test-decorator' })
  public async register(data: User) {
    const user = await prisma.user.create({ data });
    return user;
  }
}
