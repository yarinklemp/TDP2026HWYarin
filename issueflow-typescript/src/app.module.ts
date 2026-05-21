import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
