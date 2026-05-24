# Environment and dependencies
This project was developed in VSCode, with the Docker and Thunder Client extensions. Additional, yet not necessary extensions are ESLint and Prettier. Before booting the project, make sure you have Docker and Node.js installed. Open the terminal in issueflow-typescript and run npm install. Besides that, run these installs:
    npm install class-validator class-transformer
    npm install @nestjs/schedule
    npm install csv-parse csv-stringify
    npm install -D @types/multer

# Start the project
To start the project, navigate to issueflow-typescript, and run:
'docker compose up -d'
Open a new terminal, and run:
'npm run start:dev'

# Sending requests
To send requests to a running project, send to http://localhost:3000/ (by deafualt) with the relevant service at the end. Use Thunder Client to manage requsts loacly.
For services that require authentication, which are all of them except user creation, you must first send a POST request to \auth\login with a json containing a valid username and password. Then, copy the key posted back and plug it in the "Bearer" tab. Authentication will persist until logout or 1 hour had passed/

# Shuting the project down
To shut the project down, first hit ctr+C in the terminal running the server.
Then, go to another terminal and write:
'docker compose stop' 
Or, if you dont want to save DB state:
'docker compose down'

# Testing
To run tests on the system, make sure that the server isn't running (by hitting ctr+c in the terminal) and then run npm run test:e2e.
Note that you would get a console error despite passing the test - that is because the loging is async functionality, and thus gets interupted when the connection terminates abruptly.

## Services details 
#### User registry:
    Stores the regestry of the users. Supports creating, retrieving, modifing and deleting users, with the coresponding POST, GET, PATCH, DELETE commands. 
    A user must have the following fields: username, email, full_name, role, password.
    json example:
    {
        "username": "yarin",
        "email": "yarinklemp@test.com",
        "full_name": "Yarin",
        "role": "ADMIN",
        "password": "ploplop"
    }
    Note that only creating user does not require authentication. Theoretcly, this should still be protected by other means in order to avoid security breaches and attacks

##### Project regestry
    Requiers authentication. Supports creating, retrieving, modifing and deleting projects, with the coresponding POST, GET, PATCH, DELETE commands. Projects must be linked to a user.
    A project must have the following fields: name, ownerId. May have field: description
    json example:
    {
        "name": "finish this HW",
        "description": "dsgsdkgsdgsdg",
        "ownerId": 1
    }
    Only the owner themselfs or an admin can create a project attached to a user.

#### Ticket regestry
    Requiers authentication. Supports creating, retrieving, modifing and deleting tickets, with the coresponding POST, GET, PATCH, DELETE commands. Tickets are linked to a project and to a user. If user (=assignee) not provided, the system chooses automaticly the developer with the lowest workload.
    A ticket must have the following fields: title, description, statue, priority, type, projectId, and may have assigneeId, dueDate
    Status must be one of: TODO, IN_PROGRESS, IN_REVIEW, DON
    Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL.
    Type must be one of: BUG, FEATURE, TECHNICAL.
    Ticket progresion must follow the lifecycle: TODO → IN_PROGRESS → IN_REVIEW → DONE. No backward transitions, no updates when done, no skiping transitions (TODO -> DONE not allowed!)
    Ticked passed it's due date would start climing the priority. Once reached critical, it is flaged as overdue.
    Can only get tickets from a specific project, by sendig a GET /tickets?projectId=<id here>
    json example:
    {
      "title": "This is a ticket",
      "description": "It has a specific project conected to it",
      "status": "TODO",
      "priority": "HIGH",
      "type": "FEATURE",
      "projectId": 1,
      "assigneeId": 1
    }
Tickets can depend on each other. By using  POST /tickets/{ticketId}/dependencies with json {"blockedBy": dependentId } blocks ticketId's transition to DONE if depententId is not done.  GET /tickets/{ticketId}/dependencies returns all tickets this ticket is blocked by, and DELETE /tickets/{ticketId}/dependencies/{blockerId} removes a dependency.

#### Comment regestry
    Requiers authentication. Supports creating, retrieving, modifing and deleting comments, with the coresponding POST, GET, PATCH, DELETE commands. Comments are linked to a ticket and a user.
    A comment must have the following fields: content, authorId, ticketId
    Can only get comments from a specific ticket, by sendig a GET /comments?ticketId=<id here>
    json example:
    {
        "content": "yooooo",
        "authorId": 1,
         "ticketId": 1
    }

#### Attachments regestry
    Tickets have attachments, which are files of under 10MB of the type: image/png, image/jpeg, application/pdf, text/plain. Attempting to upload a file of another type or bigger size would result in an error. Since they are directly connected to tickets, they are part of the tickets hierarchy. Endpoints are:
    POST /tickets/ticketId/attachments uploads an attachment to ticketId ticket
    GET /tickets/ticketId/attachments returns all attachments connected to ticketId ticket. Note that this returns metadata only.
    GET /tickets/attachments/id returns a particular attachment
    
#### Audit logs
    As per the requeirments, every action that changes the state of the internal DB gets audited in a special log. The log can be accsessed only by admins, at this endpoint:
    GET /audit-logs/query, where query is replaced by the filters that you require.


# Personal Note
I aprritiate your consideration and time, and also this challenge. Prior to this, I had no website-development expirience, and have used this oppertunity to learn. Given more time, I would:
1) Better protect the endpoints from spofing and abuse - the current system is simplistic and not complete. For example, currently anyone can create an ADMIN user, which is a security oversite. In addition, number of created   resources is not limited, thus the server is vulnarable to attacks.
2) More comprehancive logic - the current logical systems satisfy the instructions, but are not very complex or comprehencive.
3) More tests - the current tests cover the basics, but not the rare edge cases or the complex features


```python
markdown_content = """# Environment and dependencies
This project was developed in VSCode, with the Docker and Thunder Client extensions. Additional, yet not necessary extensions are ESLint and Prettier. Before booting the project, make sure you have Docker and Node.js installed. Open the terminal in `issueflow-typescript` and run `npm install`. Besides that, run these installs:


```

```text
MD file created successfully.

```bash
npm install class-validator class-transformer
npm install @nestjs/schedule
npm install csv-parse csv-stringify
npm install -D @types/multer

```

# Start the project

To start the project, navigate to `issueflow-typescript`, and run:

```bash
docker compose up -d

```

Open a new terminal, and run:

```bash
npm run start:dev

```

# Sending requests

To send requests to a running project, send to `http://localhost:3000/` (by default) with the relevant service at the end. Use Thunder Client to manage requests locally.

For services that require authentication, which are all of them except user creation, you must first send a POST request to `/auth/login` with a JSON containing a valid username and password. Then, copy the key posted back and plug it in the "Bearer" tab. Authentication will persist until logout or 1 hour has passed.

# Shutting the project down

To shut the project down, first hit `Ctrl+C` in the terminal running the server.
Then, go to another terminal and write:

```bash
docker compose stop

```

Or, if you don't want to save DB state:

```bash
docker compose down

```

# Testing

To run tests on the system, make sure that the server isn't running (by hitting `Ctrl+C` in the terminal) and then run `npm run test:e2e`.

Note that you would get a console error despite passing the test - that is because the logging is async functionality, and thus gets interrupted when the connection terminates abruptly.

## Services details

### User registry:

Stores the registry of the users. Supports creating, retrieving, modifying and deleting users, with the corresponding POST, GET, PATCH, DELETE commands.
A user must have the following fields: `username`, `email`, `full_name`, `role`, `password`.

JSON example:

```json
{
    "username": "yarin",
    "email": "yarinklemp@test.com",
    "full_name": "Yarin",
    "role": "ADMIN",
    "password": "ploplop"
}

```

Note that only creating a user does not require authentication. Theoretically, this should still be protected by other means in order to avoid security breaches and attacks.

### Project registry

Requires authentication. Supports creating, retrieving, modifying and deleting projects, with the corresponding POST, GET, PATCH, DELETE commands. Projects must be linked to a user.
A project must have the following fields: `name`, `ownerId`. May have field: `description`.

JSON example:

```json
{
    "name": "finish this HW",
    "description": "dsgsdkgsdgsdg",
    "ownerId": 1
}

```

Only the owner themselves or an admin can create a project attached to a user.

**Deleted Projects:**

* `GET /projects/deleted` returns all of the deleted projects.
* [____]

### Ticket registry

Requires authentication. Supports creating, retrieving, modifying and deleting tickets, with the corresponding POST, GET, PATCH, DELETE commands. Tickets are linked to a project and to a user. If user (=assignee) not provided, the system chooses automatically the developer with the lowest workload.
A ticket must have the following fields: `title`, `description`, `status`, `priority`, `type`, `projectId`, and may have `assigneeId`, `dueDate`.

Status must be one of: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`.
Priority must be one of: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
Type must be one of: `BUG`, `FEATURE`, `TECHNICAL`.

Ticket progression must follow the lifecycle: `TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`. No backward transitions, no updates when done, no skipping transitions (`TODO` -> `DONE` not allowed!).
A ticket past its due date would start climbing the priority. Once reached critical, it is flagged as overdue.
Can only get tickets from a specific project, by sending a `GET /tickets?projectId=<id here>`.

JSON example:

```json
{
  "title": "This is a ticket",
  "description": "It has a specific project connected to it",
  "status": "TODO",
  "priority": "HIGH",
  "type": "FEATURE",
  "projectId": 1,
  "assigneeId": 1
}

```

Tickets can depend on each other. By using `POST /tickets/{ticketId}/dependencies` with JSON `{"blockedBy": dependentId}` blocks `ticketId`'s transition to `DONE` if `dependentId` is not done. `GET /tickets/{ticketId}/dependencies` returns all tickets this ticket is blocked by, and `DELETE /tickets/{ticketId}/dependencies/{blockerId}` removes a dependency.

**Deleted Tickets & Restoration:**

* `GET /tickets/deleted?projectId={id}` returns the deleted project.
* Admins have the ability to restore deleted tickets using the `[____]` method at the `[____]` endpoint.

### Comment registry

Requires authentication. Supports creating, retrieving, modifying and deleting comments, with the corresponding POST, GET, PATCH, DELETE commands. Comments are linked to a ticket and a user.
A comment must have the following fields: `content`, `authorId`, `ticketId`.
Can only get comments from a specific ticket, by sending a `GET /comments?ticketId=<id here>`.

JSON example:

```json
{
    "content": "yooooo",
    "authorId": 1,
    "ticketId": 1
}

```

### Attachments registry

Tickets have attachments, which are files of under 10MB of the type: `image/png`, `image/jpeg`, `application/pdf`, `text/plain`. Attempting to upload a file of another type or bigger size would result in an error. Since they are directly connected to tickets, they are part of the tickets hierarchy. Endpoints are:

* `POST /tickets/ticketId/attachments` uploads an attachment to `ticketId` ticket.
* `GET /tickets/ticketId/attachments` returns all attachments connected to `ticketId` ticket. Note that this returns metadata only.
* `GET /tickets/attachments/id` returns a particular attachment.

### Audit logs

As per the requirements, every action that changes the state of the internal DB gets audited in a special log. The log can be accessed only by admins, at this endpoint:
`GET /audit-logs/query`, where query is replaced by the filters that you require.

# Personal Note

I appreciate your consideration and time, and also this challenge. Prior to this, I had no web-development experience, and have used this opportunity to learn. Given more time, I would:

1. Better protect the endpoints from spoofing and abuse - the current system is simplistic and not complete. For example, currently anyone can create an ADMIN user, which is a security oversight. In addition, number of created resources is not limited, thus the server is vulnerable to attacks.
2. More comprehensive logic - the current logical systems satisfy the instructions, but are not very complex or comprehensive.
3. More tests - the current tests cover the basics, but not the rare edge cases or the complex features.
"""

with open("IssueFlow-Documentation.md", "w", encoding="utf-8") as f:
f.write(markdown_content)

print("MD file created successfully.")

```
Your MD file is ready
[file-tag: code-generated-file-0-1779658253811804369]

You can now download the `.md` file directly using the file card above!

```