# Start the project
To start the project, navigate to issuflow-typescript, and run:
'docker compose up -d'
Open a new terminal, and run:
'npm run start:dev'

# Sending requests
To send requests to a running project, send to http://localhost:3000/ with the relevant service at the end. Use Thunder Client to manage requsts loacly.

# Shuting the project down
To shut the project down, first hit ctr+C in the terminal running the server.
Then, go to another terminal and write:
'docker compose stop' 
Or, if you dont want to save DB state:
'docker compose down'
