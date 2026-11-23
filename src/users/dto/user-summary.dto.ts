import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../roles/user-role.enum';

export class UserSummaryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'manager@keke.local' }) email: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() active: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
}
