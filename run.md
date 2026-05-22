# Start the project
To start the project, navigate to issuflow-typescript, and run:
'docker compose up -d'
Open a new terminal, and run:
'npm run start:dev'

# Sending requests
To send requests to a running project, send to http://localhost:3000/ (by deafualt) with the relevant service at the end. Use Thunder Client to manage requsts loacly.
For services that require authentication, you must first send a POST request to \auth\login with a json containing a valid username and password. Then, copy the key posted back and plug it in the "Bearer" tab. Authentication will persist until logout or 1 hour had passed/

# Shuting the project down
To shut the project down, first hit ctr+C in the terminal running the server.
Then, go to another terminal and write:
'docker compose stop' 
Or, if you dont want to save DB state:
'docker compose down'

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

##### Project regestry
    Requiers authentication. Supports creating, retrieving, modifing and deleting projects, with the coresponding POST, GET, PATCH, DELETE commands. Projects must be linked to a user.
    A project must have the following fields: name, ownerId. May have field: description
    json example:
    {
        "name": "finish this HW",
        "description": "dsgsdkgsdgsdg",
        "ownerId": 1
    }
