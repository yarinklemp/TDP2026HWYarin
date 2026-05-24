I used gemini 3.1 pro for this assignment. Since I had no experience with website development, I did not utilized agents, as I had no idea what tasks to deligate to them. In retrospective, I should have used at least 2 agents, one developing and one testing, with preferably a third one acting as complince manager, checking the connections between the two and their complince with the requierments.
key prompts:
1)
    Help me with this assigment. Asume the following facts:
    1) I am unfamiliar with typescript, Node.js or backend development
    2) We are using typescript to solve this assigment
    3) The envirment is set up, including the docker, and the server is up. I am using VSCode, and have the extensions necessery, including thunder client.
    4) I have already completed part 2.1, and have a fully functional user regestry that is connected
    What would you recommend as the next step? If it is simmilar to the user regestry, just provide section name and general instructions, including the neccessary files to modify. Otherwise, provide implementation detail 

2) You used user.password. However, this field does not exist in the current version od the user regestry
3) Continue to section 2.3. If any CLI is needed, make sure to include it in your response. If it is better to start with implemeniting the ticket system, state that and continue to the neccessery steps
4) Attempting to add the UseGurds in the user controler requiers adding the import to the user.module, which creates a circular dependency between the two. In addition, provide the neccessery steps in order to add your recommended logic and varify that the ownerID matchs the token 
5) How does your implementation protect agains circular dependencies? i.e, if ticket A depents on ticket B that depands on ticket C that intern dependes back on ticket A, then we risk soft lock
6) Add a ticket export/import system. Make sure the files are exported correctly, and the import does not cause problems (like two tickets sharing an id)
7) Acting as a backend developer, implement the attachment managment for tickets. Make sure to enforce the strict 10 MB hard limit for the file size, and to accept only the allowed file types. Any steps simmilar to other regestries do not explain, just show. Any step that differ because we are dealing with attachments and files be sure to explain 
8) You are a senior backend developer. You have recieved this project, and have to change it to implemet requierment 3.5, the soft delete of tickets and projects. Make sure to make the deleted tickets/projects available only to ADMIN at the specified endpoint. In addition, show all the changes required to implement this in all the previously completed files. 
9) The instructions specificly stated that GET /tickets/deleted?projectId={id}  returns the deleted project, and  GET /projects/deleted returns all of the deleted. In addition, you completely ignored the admin's ability to restore deleted tickets 
10) You are a senior software engenier, who specilizes in backend development. You are tasked with implementing the Audit log feature: The system must maintain a persistent, append-only record of all state-changing actions performed within the application. This ensures a transparent history of project and ticket evolutions.All state changing actions should be recorded – those that were manually requested by the useror automatically ran by the system.  Provide an endpoint to retrieve all logs, or filtered by a specific filed. Pay close attention to the fact that the log must record all state changes. Write exactly where to change or add code to the existing code. If a change is repetative across all reerlevent files, write it once and notify all the locations it needs to be added 
11)
     You are a senior software developer, with expertise in QC and testing. Write extensive testing, covering all the requirements writen in the instructions. Note that the server was implemented using typescript.

    Your test should include but not be limited to:

    1) setup - establish connection, create legitamte users, connect to the server via one of the users, create project, tickets, comments and mentions. Have at least 5 users, with at least 1 ADMIN. There must be a minimum of 2 projects, each with at least 3 tickets. One ticket must have 3 comments with 4 mentions



    2) check resistence to iligal input. Attempt to call several endpoints with incomplete or wrong information, wrong authorization or wrong role.



    3) Apply and check changes to the DB done via any number of endpoints, and verify that the result is consistent with the instructions.



    For each test, write above it in a comment what it checks. Write as many tests as you can come up with, do not summerize or write insufficient tests 











