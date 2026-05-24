import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TicketsModule } from './tickets/tickets.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CommentsModule } from './comments/comments.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'issueflow', // Check your compose.yml for the exact username
      password: 'issueflow', // Check your compose.yml for the exact password
      database: 'issueflow', // Check your compose.yml for the exact db name
      autoLoadEntities: true, // <--- THIS IS THE MAGIC FLAG
      synchronize: true, // Auto-creates tables based on your entities (great for dev)
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
    TicketsModule,
    ScheduleModule.forRoot(),
    CommentsModule,
    AttachmentsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
