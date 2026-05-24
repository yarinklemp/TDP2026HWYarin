# Envierment and dependencies
This project was developed in VSCode, with the Docker and Thunder Client extentions. Additional, yet not neccessary extentions are ESLint and Prettier. Before booting the project, make sure you have Docker and Node.js installed. Open the terminal in issueflow-typescript and run npm install. Besides that, run these installs:
    npm install class-validator class-transformer
    npm install @nestjs/schedule
    npm install csv-parse csv-stringify
    npm install -D @types/multer

# Start the project
To start the project, navigate to issuflow-typescript, and run:
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