# Userflow
Use case 1: Admin Starting the server
1. Admin runs the program
2. Admin sets up discord bot to connect to the discord API using .env
3. Admin runs the bot

Use Case 2: Log in/Register
[]->[Login/Register]
1. User is shown the title of the app
2. User press a login with discord button
3. System just needs to identify a discord user id
4. System compares the id to the whitelisted ones
5. Only whitelisted ids are let through

Use case 3: Creating and configuring a Poll
[Home]
1. User press create a Poll
[Poll Creation]
2. User set up the channel to receive message
3. Server check if bot can see in that server
3. User set up a question on the interface
4. User set up answers 1, 2, 3, and so on until 9, optionally each with its own answers
5. User picks a live theme and result theme
NFR: Every change is always updated, no need to press save

Use case 4: Importing a Poll
[Home]
1. User press Import button
2. User is shown a prompt for a text input
3. User pastes the id of a Poll
4. User press create button on the prompt
5. System grabs the Poll that exists on the database
6. System duplicates the Poll and change the owner to the user
[Poll Creation]

Use case 5a: Starting a Poll (1)
[Home]
1. User press the Poll title on the Poll entry in a list of Polls created
[Poll Creation]
2. User press start
3. Bot check if server alreaddy has a running poll on the configured channel, if so fail -> dont start
4. If success start and check every number sent on that channel and add it to the poll
4a. As long as there arent any other numbers on the string received add an entry to the poll e.g. 111 is allowed, 121 is not allowed. This works because bot only accepts 1-9
[Live Poll]
5. After a successful start, the user is shown the live theme for the frontend of how to show off the polls.

Use case 5b: Starting a Poll (2)
[Home]
1. User press start button on the Poll entry
2. Same checks with Use case 5
[Live Poll]
3. Same as Use case 5

Use Case 6: Ending a Poll
1. User press the "End Poll" button
2. Result theme is shown with the result
3. Bot stop capturing messages
