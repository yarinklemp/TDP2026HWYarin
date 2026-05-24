import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('IssueFlow API End-to-End Tests (e2e)', () => {
  let app: INestApplication;
  
  // State to hold IDs and Tokens across tests
  const state = {
    adminToken: '',
    devTokens: [] as string[],
    users: [] as any[],
    projects: [] as any[],
    tickets: [] as any[],
    comments: [] as any[]
  };

  // =====================================================================
  // 1. SETUP & SEEDING
  // =====================================================================
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Enforce validation pipes to trigger 400 Bad Request on invalid DTOs
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    // 1. Create 5 Users (1 Admin, 4 Developers)
    const userPayloads = [
      { username: 'admin1', password: 'Password1!', email: 'admin1@test.com', full_name: 'Admin One', role: 'ADMIN' },
      { username: 'dev1', password: 'Password1!', email: 'dev1@test.com', full_name: 'Dev One', role: 'DEVELOPER' },
      { username: 'dev2', password: 'Password1!', email: 'dev2@test.com', full_name: 'Dev Two', role: 'DEVELOPER' },
      { username: 'dev3', password: 'Password1!', email: 'dev3@test.com', full_name: 'Dev Three', role: 'DEVELOPER' },
      { username: 'dev4', password: 'Password1!', email: 'dev4@test.com', full_name: 'Dev Four', role: 'DEVELOPER' },
    ];

    for (const payload of userPayloads) {
      const res = await request(app.getHttpServer()).post('/users').send(payload);
      state.users.push(res.body);

      if (res.status !== 201) {
          console.error('Registration failed for:', payload.username, res.body);
      }
      expect(res.status).toBe(201);
      state.users.push(res.body);
      
      // Login to get JWT
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: payload.username, password: payload.password });

        if (loginRes.status !== 200 && loginRes.status !== 201) {
          console.error('Login failed for:', payload.username, loginRes.body);
      }
      expect(loginRes.status).toBeGreaterThanOrEqual(200);
      expect(loginRes.status).toBeLessThan(300);

      const token = loginRes.body.accessToken || loginRes.body.access_token || loginRes.body.token;
        
      if (payload.role === 'ADMIN') {
        state.adminToken = token;
      } else {
        state.devTokens.push(token);
      }
    }

    // 2. Create 2 Projects
    for (let i = 1; i <= 2; i++) {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${state.adminToken}`)
        .send({ name: `Project ${i}`, description: `Desc ${i}`, ownerId: state.users[0].id });
      state.projects.push(res.body);
      if (res.status !== 201 && res.status !== 200) {
        console.error('Project creation failed for:', `Project ${i}`, res.body);
      }
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    }

    // 3. Create 6 Tickets (3 per project)
    for (const project of state.projects) {
      for (let i = 1; i <= 3; i++) {
        const res = await request(app.getHttpServer())
          .post('/tickets')
          .set('Authorization', `Bearer ${state.adminToken}`)
          .send({
            title: `Ticket ${i} for ${project.name}`,
            description: 'Test ticket',
            status: 'TODO',
            priority: 'MEDIUM',
            type: 'FEATURE',
            projectId: project.id,
            assigneeId: state.users[1].id // Assigned to Dev 1 initially
          });
        state.tickets.push(res.body);
      }
    }

    // 4. Create 3 comments with 4 mentions on Ticket #1
    const ticketOneId = state.tickets[0].id;
    const commentPayloads = [
      { content: 'Hey @dev1, check this out.', authorId: state.users[1].id },
      { content: 'I think @dev2 and @dev3 should review.', authorId: state.users[1].id },
      { content: 'Final thoughts, @admin1?', authorId: state.users[2].id }
    ];

    for (const payload of commentPayloads) {
      const res = await request(app.getHttpServer())
        .post(`/tickets/${ticketOneId}/comments`)
        .set('Authorization', `Bearer ${state.adminToken}`)
        .send(payload);
      state.comments.push(res.body);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // =====================================================================
  // 2. ILLEGAL INPUTS & AUTHORIZATION (NEGATIVE TESTS)
  // =====================================================================
  describe('Security & Validation Resistance', () => {

    // Checks that unauthenticated requests are rejected.
    it('should reject requests without a JWT token', async () => {
      const res = await request(app.getHttpServer()).get('/projects');
      expect(res.status).toBe(401);
    });

    // Checks resistance to illegal user roles during registration
    it('should reject user creation with an invalid role', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ username: 'hacker', email: 'h@h.com', password: '123', full_name: 'Hack', role: 'SUPERUSER' });
      expect(res.status).toBe(400); // Bad Request due to validation pipe
    });

    // Checks that DEVELOPER role cannot access ADMIN-only soft-deleted endpoints
    it('should forbid DEVELOPER from accessing soft-deleted projects', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects/deleted')
        .set('Authorization', `Bearer ${state.devTokens[0]}`);
      expect(res.status).toBe(403); // Forbidden
    });

    // Checks that a ticket cannot be created with invalid status or priority
    it('should reject ticket creation with invalid ENUM values', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${state.devTokens[0]}`)
        .send({
          title: 'Bad Ticket',
          status: 'DOING_IT', // Invalid
          priority: 'SUPER_HIGH', // Invalid
          type: 'BUG',
          projectId: state.projects[0].id
        });
      expect(res.status).toBe(400);
    });
  });

  // =====================================================================
  // 3. STATE TRANSITIONS & DB CONSISTENCY
  // =====================================================================
  describe('Ticket Lifecycle & Database Consistency', () => {

    // Checks that status can only move forward (TODO -> IN_PROGRESS)
    it('should successfully transition ticket status forward', async () => {
      const ticketId = state.tickets[0].id;
      const res = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${state.devTokens[0]}`)
        .send({ status: 'IN_PROGRESS' });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    // Checks that backward status transitions are blocked
    it('should reject backward status transitions (IN_PROGRESS -> TODO)', async () => {
      const ticketId = state.tickets[0].id; // Currently IN_PROGRESS
      const res = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${state.devTokens[0]}`)
        .send({ status: 'TODO' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Backward transitions are not allowed');
    });

    // Checks that DONE tickets are completely immutable
    it('should prevent updates to a ticket once it is DONE', async () => {
      const ticketId = state.tickets[1].id;
      
      // Move to DONE
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${state.devTokens[0]}`)
        .send({ status: 'DONE' });

      // Attempt to update priority
      const res = await request(app.getHttpServer())
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${state.devTokens[0]}`)
        .send({ priority: 'HIGH' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Ticket cannot be updated once it is DONE');
    });

    // Checks Ticket Dependencies: Cannot close ticket if blocker exists
    it('should prevent transition to DONE if ticket has unresolved blockers', async () => {
      const blockedTicketId = state.tickets[2].id;
      const blockerTicketId = state.tickets[3].id; // In TODO

      // Add dependency
      await request(app.getHttpServer())
        .post(`/tickets/${blockedTicketId}/dependencies`)
        .set('Authorization', `Bearer ${state.devTokens[0]}`)
        .send({ blockedBy: blockerTicketId });

      // Try to close blocked ticket
      const res = await request(app.getHttpServer())
        .patch(`/tickets/${blockedTicketId}`)
        .set('Authorization', `Bearer ${state.devTokens[0]}`)
        .send({ status: 'DONE' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('unresolved blockers');
    });
  });

  // =====================================================================
  // 4. EXTENDED FEATURES
  // =====================================================================
  describe('Extended Business Features', () => {

    // Checks Mentions feature works and parses @usernames correctly
    it('should correctly parse mentions and retrieve them for the user', async () => {
      const targetUserId = state.users[2].id; // dev2 was mentioned in setup
      const res = await request(app.getHttpServer())
        .get(`/users/${targetUserId}/mentions`)
        .set('Authorization', `Bearer ${state.devTokens[1]}`); // dev2's token
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].content).toContain('@dev2');
      expect(res.body[0].mentionedUsers.some(u => u.username === 'dev2')).toBe(true);
    });

    // Checks Auto-Assignment logic (Assigns to least-loaded developer)
    it('should auto-assign ticket to the least loaded DEVELOPER', async () => {
      // Currently, dev1 has multiple tickets. dev2, dev3, dev4 have 0. 
      // Tie-breaker goes to oldest registrant (dev2).
      const res = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${state.adminToken}`)
        .send({
          title: 'Auto Assigned Ticket',
          description: 'Testing workload distribution',
          status: 'TODO',
          priority: 'LOW',
          type: 'TECHNICAL',
          projectId: state.projects[0].id
          // Notice: assigneeId is intentionally omitted
        });

      expect(res.status).toBe(201);
      expect(res.body.assigneeId).toBe(state.users[2].id); // Assigned to dev2
      
      // Verify Audit Log caught the SYSTEM action
      const auditRes = await request(app.getHttpServer())
        .get('/audit')
        .set('Authorization', `Bearer ${state.adminToken}`);
        
      const autoAssignLog = auditRes.body.find(log => log.ticketId === res.body.id && log.action === 'AUTO_ASSIGN');
      expect(autoAssignLog).toBeDefined();
      expect(autoAssignLog.actor).toBe('SYSTEM');
    });

    // Checks Soft-Delete mechanisms and Admin Recovery
    it('should soft-delete a project, hide it, and allow Admin recovery', async () => {
      const projectId = state.projects[1].id;

      // Soft delete
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${state.adminToken}`);

      // Verify it's hidden from standard fetch
      const hiddenRes = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${state.adminToken}`);
      expect(hiddenRes.status).toBe(404);

      // Verify it appears in Admin deleted list
      const deletedRes = await request(app.getHttpServer())
        .get('/projects/deleted')
        .set('Authorization', `Bearer ${state.adminToken}`);
      expect(deletedRes.body.some(p => p.id === projectId)).toBe(true);

      // Restore
      const restoreRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/restore`)
        .set('Authorization', `Bearer ${state.adminToken}`);
      expect(restoreRes.status).toBe(200);

      // Verify it's accessible again
      const recoveredRes = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${state.adminToken}`);
      expect(recoveredRes.status).toBe(200);
    });

  });
});