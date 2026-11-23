import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GraphqlAwareThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType<GqlContextType>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext();
      return { req: gqlContext.req, res: gqlContext.res };
    }

    return super.getRequestResponse(context);
  }
}
