import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../../users/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request =
      context.getType<GqlContextType>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    return request.user;
  },
);
